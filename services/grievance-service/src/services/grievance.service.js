// Core business logic for grievance service

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { pool, query, withTransaction } from '../db.js';
import { complaintCounter, escalationCounter } from '../metrics.js';

export const notificationEmitter = new EventEmitter();

/**
 * Create a new complaint
 * @param {object} client - DB client (can be transaction client)
 * @param {string} posterId - User ID of poster (null if anonymous)
 * @param {object} data - { platform, category, title, description, city_zone }
 * @param {boolean} anonymous - If true, poster_id is stored as NULL
 * @returns {object} Complaint with similar_complaints array
 */
export async function createComplaint(client, posterId, posterName, data, anonymous) {
  const { platform, category, title, description, city_zone, images = [] } = data;
  
  const id = randomUUID();
  const now = new Date();
  
  // Store NULL if anonymous, otherwise store posterId
  const actualPosterId = anonymous ? null : posterId;
  const actualPosterName = anonymous ? 'Anonymous Worker' : posterName;
  
  const result = await client.query(
    `INSERT INTO grievance_schema.complaints
     (id, poster_id, poster_name, platform, category, title, description, city_zone, images, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, poster_id, poster_name, platform, category, title, description, city_zone, images, status,
               upvote_count, created_at, updated_at,
               escalated_by, escalated_at, resolved_by, resolved_at`,
    [id, actualPosterId, actualPosterName, platform, category, title, description, city_zone || null, JSON.stringify(images), now, now]
  );
  
  const complaint = result.rows[0];
  
  // Record metric
  complaintCounter.labels(platform, category).inc();
  
  // Find similar complaints
  const similar = await findSimilar(client, platform, category);
  
  // Fetch tags (new complaint has none)
  complaint.tags = [];
  complaint.similar_complaints = similar;
  
  return complaint;
}

/**
 * List complaints with pagination and filtering
 * @param {object} client - DB client
 * @param {object} filters - { platform?, category?, status?, city_zone? }
 * @param {object} pagination - { page, limit }
 * @returns {object} { complaints, total, page, pages }
 */
export async function listComplaints(client, filters, pagination, requestingUserId = null) {
  const { platform, category, status, city_zone, poster_id } = filters;
  const { page = 1, limit = 20 } = pagination;
  
  // Validate limit
  const actualLimit = Math.min(Math.max(1, limit), 50);
  const offset = (page - 1) * actualLimit;
  
  // Build WHERE clause
  let where = [];
  let params = [];
  let paramCount = 1;
  
  if (platform) {
    where.push(`platform = $${paramCount++}`);
    params.push(platform);
  }
  if (category) {
    where.push(`category = $${paramCount++}`);
    params.push(category);
  }
  if (status) {
    where.push(`status = $${paramCount++}`);
    params.push(status);
  }
  if (city_zone) {
    where.push(`city_zone = $${paramCount++}`);
    params.push(city_zone);
  }
  if (poster_id) {
    where.push(`poster_id = $${paramCount++}`);
    params.push(poster_id);
  }
  
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  
  // Get total count
  const countResult = await client.query(
    `SELECT COUNT(*) as total FROM grievance_schema.complaints ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);
  const pages = Math.ceil(total / actualLimit);
  
  // Get paginated results
  const listParams = [...params, actualLimit, offset];
  const query = `
    SELECT c.id, c.poster_id, c.poster_name, c.platform, c.category, c.title, c.description, c.city_zone, c.images, c.status,
           c.upvote_count, c.created_at, c.updated_at,
           c.escalated_by, c.escalated_at, c.resolved_by, c.resolved_at
           ${requestingUserId ? `, EXISTS(SELECT 1 FROM grievance_schema.complaint_upvotes cu WHERE cu.complaint_id = c.id AND cu.user_id = $${paramCount + 2}) as is_upvoted` : ', FALSE as is_upvoted'}
    FROM grievance_schema.complaints c
    ${whereClause}
    ORDER BY c.upvote_count DESC, c.created_at DESC
    LIMIT $${paramCount} OFFSET $${paramCount + 1}
  `;
  
  if (requestingUserId) listParams.push(requestingUserId);

  const result = await client.query(query, listParams);
  
  // Fetch tags for each complaint
  const complaints = await Promise.all(
    result.rows.map(async (complaint) => {
      const tagsResult = await client.query(
        `SELECT tag FROM grievance_schema.complaint_tags WHERE complaint_id = $1`,
        [complaint.id]
      );
      complaint.tags = tagsResult.rows.map(r => r.tag);
      return complaint;
    })
  );
  
  return { complaints, total, page, pages };
}

/**
 * Get a single complaint with tags
 * @param {object} client - DB client
 * @param {string} id - Complaint ID
 * @returns {object} Complaint with tags array
 */
export async function getComplaint(client, id) {
  const result = await client.query(
    `SELECT id, poster_id, poster_name, platform, category, title, description, city_zone, images, status,
            upvote_count, created_at, updated_at,
            escalated_by, escalated_at, resolved_by, resolved_at
     FROM grievance_schema.complaints WHERE id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const complaint = result.rows[0];
  
  // Fetch tags
  const tagsResult = await client.query(
    `SELECT tag FROM grievance_schema.complaint_tags WHERE complaint_id = $1`,
    [id]
  );
  complaint.tags = tagsResult.rows.map(r => r.tag);
  
  return complaint;
}

/**
 * Delete a complaint (only if poster_id matches and status is OPEN)
 * @param {object} client - DB client
 * @param {string} id - Complaint ID
 * @param {string} workerId - User ID of requester
 * @throws 403 if not owner, 409 if not OPEN
 */
export async function deleteComplaint(client, id, workerId) {
  // Get the complaint first
  const result = await client.query(
    `SELECT poster_id, status FROM grievance_schema.complaints WHERE id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Complaint not found');
  }
  
  const { poster_id, status } = result.rows[0];
  
  // Check ownership (including anonymous: if complaint is anonymous, poster_id is NULL)
  if (poster_id !== workerId) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  
  // Check status
  if (status !== 'OPEN') {
    const err = new Error('Conflict: only OPEN complaints can be deleted');
    err.status = 409;
    throw err;
  }
  
  // Delete (cascades to tags and upvotes)
  await client.query(
    `DELETE FROM grievance_schema.complaints WHERE id = $1`,
    [id]
  );
}

/**
 * Add or remove an upvote (idempotent)
 * @param {object} client - DB client
 * @param {string} complaintId - Complaint ID
 * @param {string} userId - User ID
 * @param {boolean} add - True to add upvote, false to remove
 * @returns {object} { upvote_count }
 */
export async function toggleUpvote(client, complaintId, userId, userName) {
  // Check if upvote exists
  const checkResult = await client.query(
    `SELECT 1 FROM grievance_schema.complaint_upvotes WHERE complaint_id = $1 AND user_id = $2`,
    [complaintId, userId]
  );
  
  const exists = checkResult.rows.length > 0;
  
  if (exists) {
    // REMOVE upvote
    await client.query(
      `DELETE FROM grievance_schema.complaint_upvotes WHERE complaint_id = $1 AND user_id = $2`,
      [complaintId, userId]
    );
  } else {
    // ADD upvote
    await client.query(
      `INSERT INTO grievance_schema.complaint_upvotes (complaint_id, user_id, created_at)
       VALUES ($1, $2, NOW())`,
      [complaintId, userId]
    );

    // Notify the poster
    const posterResult = await client.query(
      `SELECT poster_id, title FROM grievance_schema.complaints WHERE id = $1`,
      [complaintId]
    );
    
    if (posterResult.rows.length > 0 && posterResult.rows[0].poster_id && posterResult.rows[0].poster_id !== userId) {
      const { poster_id, title } = posterResult.rows[0];
      await createNotification(
        client,
        poster_id,
        'upvote',
        userName,
        `${userName} upvoted your report: "${title}"`,
        `/app/worker/community?complaint=${complaintId}`
      );
    }
  }
  
  // Recalculate upvote_count
  const countResult = await client.query(
    `SELECT COUNT(*) as count FROM grievance_schema.complaint_upvotes WHERE complaint_id = $1`,
    [complaintId]
  );
  const upvoteCount = parseInt(countResult.rows[0].count, 10);
  
  // Update denormalized count
  await client.query(
    `UPDATE grievance_schema.complaints SET upvote_count = $1 WHERE id = $2`,
    [upvoteCount, complaintId]
  );
  
  return { upvote_count: upvoteCount, added: !exists };
}

/**
 * Add a tag to a complaint (advocates only)
 * @param {object} client - DB client
 * @param {string} complaintId - Complaint ID
 * @param {string} advocateId - Advocate user ID
 * @param {string} tag - Tag text (1-50 chars)
 * @returns {object} { tag }
 */
export async function addTag(client, complaintId, advocateId, tag) {
  const trimmedTag = tag.trim();
  
  if (!trimmedTag || trimmedTag.length > 50) {
    const err = new Error('Invalid tag: must be 1-50 characters');
    err.status = 400;
    throw err;
  }
  
  const id = randomUUID();
  
  await client.query(
    `INSERT INTO grievance_schema.complaint_tags (id, complaint_id, tag, tagged_by, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [id, complaintId, trimmedTag, advocateId]
  );
  
  return { tag: trimmedTag };
}

/**
 * Update complaint status (escalate or resolve)
 * @param {object} client - DB client
 * @param {string} complaintId - Complaint ID
 * @param {string} advocateId - Advocate user ID
 * @param {string} newStatus - 'ESCALATED' or 'RESOLVED'
 * @returns {object} Updated complaint
 */
export async function updateStatus(client, complaintId, advocateId, newStatus) {
  if (!['ESCALATED', 'RESOLVED'].includes(newStatus)) {
    const err = new Error('Invalid status');
    err.status = 400;
    throw err;
  }
  
  let updateSql = '';
  let params = [];
  
  if (newStatus === 'ESCALATED') {
    updateSql = `UPDATE grievance_schema.complaints
                 SET status = $1, escalated_by = $2, escalated_at = NOW()
                 WHERE id = $3`;
    params = ['ESCALATED', advocateId, complaintId];
  } else {
    updateSql = `UPDATE grievance_schema.complaints
                 SET status = $1, resolved_by = $2, resolved_at = NOW()
                 WHERE id = $3`;
    params = ['RESOLVED', advocateId, complaintId];
  }
  
  const result = await client.query(updateSql, params);
  
  escalationCounter.labels(newStatus === 'ESCALATED' ? 'escalate' : 'resolve').inc();
  
  // Return updated complaint
  return getComplaint(client, complaintId);
}

/**
 * Get overall complaint statistics
 * @param {object} client - DB client
 * @returns {object} Stats object
 */
export async function getStats(client) {
  // Total counts by status
  const statusResult = await client.query(
    `SELECT status, COUNT(*) as count FROM grievance_schema.complaints GROUP BY status`
  );
  
  let stats = {
    total: 0,
    open: 0,
    escalated: 0,
    resolved: 0,
  };
  
  for (const row of statusResult.rows) {
    stats[row.status.toLowerCase()] = parseInt(row.count, 10);
    stats.total += parseInt(row.count, 10);
  }
  
  // By platform
  const platformResult = await client.query(
    `SELECT platform, COUNT(*) as count, AVG(upvote_count::float) as avg_upvotes
     FROM grievance_schema.complaints
     GROUP BY platform
     ORDER BY count DESC`
  );
  
  stats.by_platform = platformResult.rows.map(row => ({
    platform: row.platform,
    count: parseInt(row.count, 10),
    avg_upvotes: Math.round(parseFloat(row.avg_upvotes || 0) * 100) / 100,
  }));
  
  // By category
  const categoryResult = await client.query(
    `SELECT category, COUNT(*) as count
     FROM grievance_schema.complaints
     GROUP BY category
     ORDER BY count DESC`
  );
  
  stats.by_category = categoryResult.rows.map(row => ({
    category: row.category,
    count: parseInt(row.count, 10),
  }));
  
  // Top 5 from last 7 days
  const topResult = await client.query(
    `SELECT id, title, upvote_count FROM grievance_schema.complaints
     WHERE created_at >= NOW() - INTERVAL '7 days'
     ORDER BY upvote_count DESC
     LIMIT 5`
  );
  
  stats.top_this_week = topResult.rows.map(row => ({
    id: row.id,
    title: row.title,
    upvote_count: row.upvote_count,
  }));
  
  return stats;
}

/**
 * Find similar existing complaints (same platform & category, not resolved)
 * @param {object} client - DB client
 * @param {string} platform - Platform name
 * @param {string} category - Category
 * @returns {array} Array of { id, title }
 */
export async function findSimilar(client, platform, category) {
  const result = await client.query(
    `SELECT id, title FROM grievance_schema.complaints
     WHERE platform = $1 AND category = $2 AND status != 'RESOLVED'
     ORDER BY created_at DESC LIMIT 10`,
    [platform, category]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
  }));
}

/**
 * Add a comment to a complaint and notify the poster
 * @param {object} client - DB client
 * @param {string} complaintId - Complaint ID
 * @param {string} authorId - Author ID
 * @param {string} authorName - Author name
 * @param {string} body - Comment text
 * @returns {object} Created comment
 */
export async function addComment(client, complaintId, authorId, authorName, body) {
  const commentId = randomUUID();
  
  // Insert comment
  const result = await client.query(
    `INSERT INTO grievance_schema.complaint_comments (id, complaint_id, author_id, author_name, body, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [commentId, complaintId, authorId, authorName, body]
  );
  
  const comment = result.rows[0];
  
  // Find original poster to notify
  const posterResult = await client.query(
    `SELECT poster_id, title FROM grievance_schema.complaints WHERE id = $1`,
    [complaintId]
  );
  
  if (posterResult.rows.length > 0 && posterResult.rows[0].poster_id && posterResult.rows[0].poster_id !== authorId) {
    const { poster_id, title } = posterResult.rows[0];
    await createNotification(
      client,
      poster_id,
      'comment',
      authorName,
      `${authorName} commented on your report: "${title}"`,
      `/app/worker/community?complaint=${complaintId}`
    );
  }
  
  return comment;
}

/**
 * Get comments for a complaint
 */
export async function getComments(client, complaintId) {
  const result = await client.query(
    `SELECT * FROM grievance_schema.complaint_comments 
     WHERE complaint_id = $1 
     ORDER BY created_at ASC`,
    [complaintId]
  );
  return result.rows;
}

/**
 * Create a notification
 */
export async function createNotification(client, userId, type, senderName, message, link) {
  const id = randomUUID();
  const now = new Date();
  await client.query(
    `INSERT INTO grievance_schema.notifications (id, user_id, type, sender_name, message, link, is_read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)`,
    [id, userId, type, senderName, message, link, now]
  );

  notificationEmitter.emit('notification', {
    id,
    user_id: userId,
    type,
    sender_name: senderName,
    message,
    link,
    is_read: false,
    created_at: now.toISOString()
  });
}

/**
 * Get user notifications
 */
export async function getNotifications(client, userId) {
  const result = await client.query(
    `SELECT * FROM grievance_schema.notifications 
     WHERE user_id = $1 
     ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return result.rows;
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(client, notificationId, userId) {
  await client.query(
    `UPDATE grievance_schema.notifications SET is_read = TRUE 
     WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
}

// Complaint endpoints

import { pool, withTransaction, query } from '../db.js';
import { authenticate, requireRole } from '../hooks/authenticate.js';
import {
  createComplaint,
  listComplaints,
  getComplaint,
  deleteComplaint,
  toggleUpvote,
  addTag,
  updateStatus,
  getStats,
} from '../services/grievance.service.js';

async function complaintsRoutes(fastify) {
  // GET /api/grievance/complaints — List all complaints (public, no auth)
  fastify.get('/complaints', async (request, reply) => {
    const { platform, category, status, city_zone, page = 1, limit = 20 } = request.query;
    
    const filters = { platform, category, status, city_zone };
    const pagination = { page: parseInt(page, 10), limit: parseInt(limit, 10) };
    
    try {
      const result = await listComplaints(pool, filters, pagination);
      return reply.code(200).send(result);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // POST /api/grievance/complaints — Create a new complaint (auth required)
  fastify.post('/complaints', { preHandler: [authenticate] }, async (request, reply) => {
    const { platform, category, title, description, city_zone, anonymous } = request.body;
    
    // Validate required fields
    if (!platform || !category || !title || !description) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'Missing required fields: platform, category, title, description',
      });
    }
    
    try {
      const complaint = await withTransaction(async (client) => {
        return createComplaint(
          client,
          request.user.sub,
          { platform, category, title, description, city_zone },
          anonymous === true
        );
      });
      
      return reply.code(201).send(complaint);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // GET /api/grievance/complaints/:id — Get a single complaint (public)
  fastify.get('/complaints/:id', async (request, reply) => {
    const { id } = request.params;
    
    try {
      const complaint = await getComplaint(pool, id);
      
      if (!complaint) {
        return reply.code(404).send({ error: 'Complaint not found' });
      }
      
      return reply.code(200).send(complaint);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // DELETE /api/grievance/complaints/:id — Delete complaint (owner+OPEN only)
  fastify.delete('/complaints/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params;
    
    try {
      await withTransaction(async (client) => {
        await deleteComplaint(client, id, request.user.sub);
      });
      
      return reply.code(204).send();
    } catch (err) {
      if (err.status === 403) {
        return reply.code(403).send({ error: 'Forbidden', message: 'You can only delete your own complaints' });
      }
      if (err.status === 409) {
        return reply.code(409).send({ error: 'Conflict', message: 'Only OPEN complaints can be deleted' });
      }
      if (err.message === 'Complaint not found') {
        return reply.code(404).send({ error: 'Complaint not found' });
      }
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // POST /api/grievance/complaints/:id/upvote — Add upvote (auth required)
  fastify.post('/complaints/:id/upvote', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params;
    
    try {
      const result = await withTransaction(async (client) => {
        return toggleUpvote(client, id, request.user.sub, true);
      });
      
      return reply.code(200).send(result);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // DELETE /api/grievance/complaints/:id/upvote — Remove upvote (auth required)
  fastify.delete('/complaints/:id/upvote', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params;
    
    try {
      const result = await withTransaction(async (client) => {
        return toggleUpvote(client, id, request.user.sub, false);
      });
      
      return reply.code(200).send(result);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // POST /api/grievance/complaints/:id/tags — Add tag (advocate only)
  fastify.post('/complaints/:id/tags', 
    { preHandler: [authenticate, requireRole('advocate')] }, 
    async (request, reply) => {
      const { id } = request.params;
      const { tag } = request.body;
      
      if (!tag) {
        return reply.code(400).send({
          error: 'Bad request',
          message: 'Missing required field: tag',
        });
      }
      
      try {
        const result = await withTransaction(async (client) => {
          return addTag(client, id, request.user.sub, tag);
        });
        
        return reply.code(201).send(result);
      } catch (err) {
        if (err.status === 400) {
          return reply.code(400).send({ error: 'Bad request', message: err.message });
        }
        fastify.log.error(err);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
  
  // PATCH /api/grievance/complaints/:id/status — Update status (advocate only)
  fastify.patch('/complaints/:id/status',
    { preHandler: [authenticate, requireRole('advocate')] },
    async (request, reply) => {
      const { id } = request.params;
      const { status } = request.body;
      
      if (!status) {
        return reply.code(400).send({
          error: 'Bad request',
          message: 'Missing required field: status',
        });
      }
      
      try {
        const complaint = await withTransaction(async (client) => {
          return updateStatus(client, id, request.user.sub, status);
        });
        
        return reply.code(200).send(complaint);
      } catch (err) {
        if (err.status === 400) {
          return reply.code(400).send({ error: 'Bad request', message: err.message });
        }
        fastify.log.error(err);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
  
  // GET /api/grievance/stats — Get statistics (public)
  fastify.get('/stats', async (request, reply) => {
    try {
      const stats = await getStats(pool);
      return reply.code(200).send(stats);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

export default complaintsRoutes;

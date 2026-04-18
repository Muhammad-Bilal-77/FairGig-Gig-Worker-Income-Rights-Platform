import requests
import sys
import uuid

base_auth = "http://localhost:4001"
base_grievance = "http://localhost:4004"

# 1. Login with existing verified user
email = "mb3454545@gmail.com"
password = "Password1234"

login_res = requests.post(f"{base_auth}/api/auth/login", json={"email": email, "password": password})
if login_res.status_code != 200:
    print("Login failed", login_res.status_code, login_res.text)
    sys.exit(1)

token = login_res.json().get('access_token')
if not token:
    token = login_res.json().get('token')
headers = {"Authorization": f"Bearer {token}"}

# 2. Get complaints
comp_res = requests.get(f"{base_grievance}/api/grievance/complaints")
complaints = comp_res.json().get('complaints', [])
if not complaints:
    print("No complaints found")
    sys.exit(1)

comp_id = complaints[0]['id']
print(f"Testing on complaint {comp_id}")

# 3. Add comment
print("Adding comment...")
comment_res = requests.post(f"{base_grievance}/api/grievance/complaints/{comp_id}/comments",
                            json={"body": "Test comment via script"}, headers=headers)

if comment_res.status_code != 200:
    print("Comment failed", comment_res.status_code, comment_res.text)
else:
    print("Comment success:", comment_res.json())

# 4. Upvote
print("Upvoting...")
upvote_res = requests.post(f"{base_grievance}/api/grievance/complaints/{comp_id}/upvote", headers=headers)
if upvote_res.status_code != 200:
    print("Upvote failed", upvote_res.status_code, upvote_res.text)
else:
    print("Upvote success:", upvote_res.json())

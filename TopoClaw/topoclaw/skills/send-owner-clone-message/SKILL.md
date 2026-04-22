---
name: send-owner-clone-message
description: Send a friend or group message through the same human message channel, but with the current TopoClaw owner's digital clone identity.
metadata: {"topoclaw":{"emoji":"💬","requires":{"bins":["python"]}}}
---

# Send Owner Clone Message

Use this skill when the user asks TopoClaw to send a message to a friend or group **as the current owner's digital clone**.

This skill intentionally uses the same customer_service message routes as normal user sending:
- friend: `POST /api/friends/send-message`
- group: `POST /api/groups/send-message`

## Inputs

- `TOPO_IMEI` (required): current caller IMEI (owner IMEI of this TopoClaw)
  - in TopoDesktop built-in assistant chats, runtime context auto-injects the current logged-in IMEI
- `target_type` (required): `friend` or `group`
- `target_id` (required):
  - friend mode: friend IMEI
  - group mode: group ID
- `content` (required): message text
- `sender_label` (optional): clone display name; default `我的数字分身`
- auto-fill env (recommended):
  - `TOPO_TARGET_TYPE`
  - `TOPO_TARGET_ID`
  - `TOPO_MESSAGE_CONTENT`
  - `TOPO_SENDER_LABEL`
- `CUSTOMER_SERVICE_URL` (optional): service base URL override
- `VITE_MOBILE_AGENT_CUSTOMER_SERVICE_URL` (recommended): default customer_service base URL from TopoDesktop `.env.local`
  - recommendation: always configure this variable in `TopoDesktop/.env.local`
  - when missing, fail fast with explicit error instead of silently falling back to `127.0.0.1`

## Output

Structured JSON:
- `success`
- `target_type`
- `target_id`
- `owner_imei`
- `sender_label`
- `content_preview`
- `raw` (server response)

## Reference Script

```python
import os
import json
import requests

owner_imei = os.getenv("TOPO_IMEI", "").strip() or os.getenv("IMEI", "").strip()
base_url = (
    os.getenv("CUSTOMER_SERVICE_URL", "").strip()
    or os.getenv("VITE_MOBILE_AGENT_CUSTOMER_SERVICE_URL", "").strip()
).rstrip("/")

# Editable inputs（优先环境变量自动填充，减少首次调用重试）
target_type = os.getenv("TOPO_TARGET_TYPE", "").strip().lower()
target_id = os.getenv("TOPO_TARGET_ID", "").strip()
content = os.getenv("TOPO_MESSAGE_CONTENT", "").strip()
sender_label = os.getenv("TOPO_SENDER_LABEL", "").strip() or "我的数字分身"

if not owner_imei:
    raise RuntimeError("Missing TOPO_IMEI (current caller IMEI)")
if not base_url:
    raise RuntimeError("Missing customer_service URL: set VITE_MOBILE_AGENT_CUSTOMER_SERVICE_URL in TopoDesktop/.env.local")
if target_type not in ("friend", "group"):
    raise RuntimeError("target_type must be 'friend' or 'group' (set TOPO_TARGET_TYPE)")
if not target_id:
    raise RuntimeError("target_id is required (set TOPO_TARGET_ID)")
if not content:
    raise RuntimeError("content is required (set TOPO_MESSAGE_CONTENT)")

common_clone_fields = {
    "senderLabel": sender_label,
    "isCloneReply": True,
    "cloneOwnerImei": owner_imei,
    "cloneOrigin": "digital_clone",
}

if target_type == "friend":
    url = f"{base_url}/api/friends/send-message"
    payload = {
        "imei": owner_imei,
        "targetImei": target_id,
        "content": content,
        "message_type": "text",
        **common_clone_fields,
    }
else:
    url = f"{base_url}/api/groups/send-message"
    payload = {
        "imei": owner_imei,
        "groupId": target_id,
        "content": content,
        "message_type": "text",
        "skipServerAssistantDispatch": False,
        # 群里展示字段与单聊字段都传，兼容不同端解析
        "sender": sender_label,
        **common_clone_fields,
    }

resp = requests.post(url, json=payload, timeout=20)
resp.raise_for_status()
raw = resp.json()
if not raw.get("success"):
    raise RuntimeError(f"send owner clone message failed: {raw}")

result = {
    "success": True,
    "target_type": target_type,
    "target_id": target_id,
    "owner_imei": owner_imei,
    "sender_label": sender_label,
    "content_preview": content[:80],
    "raw": raw,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
```

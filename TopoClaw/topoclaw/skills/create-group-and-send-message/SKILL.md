---
name: create-group-and-send-message
description: Unified group creation skill supporting multiple friends and assistants, with optional first message sending.
metadata: {"topoclaw":{"emoji":"⚡","requires":{"bins":["python"]}}}
---

# Create Group And Send Message

Use this as the only group-creation skill. It supersedes legacy `create-group`.

## Hard Safety Constraints

- API-only execution; do not use shell orchestration for this workflow.
- Do not call `write_file` to generate temporary `.py` files.
- Do not run `exec` with script-file paths.
- Do not use shell redirection like `>nul`, `2>nul`, `> /dev/null`.
- Do not write under packaged runtime paths such as `release/win-unpacked/resources/...`.

## Inputs

- `TOPO_IMEI` (required): caller IMEI
- `TOPO_OWNER_IMEI` (optional): owner IMEI override, default caller IMEI
- `TOPO_GROUP_NAME` (optional): group name, default `我的新群组`
- `TOPO_FRIEND_IMEIS` (optional): JSON array or comma-separated IMEIs
- `TOPO_TARGET_FRIEND` (optional, backward-compatible): one selector (`昵称/姓名/IMEI`)
- `TOPO_TARGET_FRIENDS` (optional): JSON array or comma-separated selectors (`昵称/姓名/IMEI`)
- `TOPO_ASSISTANT_DISPLAY_IDS` (optional): JSON array or comma-separated display IDs
- `TOPO_ASSISTANT_IDS` (optional, deprecated): alias for display IDs
- `TOPO_GROUP_MANAGER_ASSISTANT_DISPLAY_ID` (optional): display ID to enable GroupManager capability
- `TOPO_GROUP_MANAGER_ASSISTANT_ID` (optional, deprecated): alias
- `TOPO_AUTO_ADD_FRIEND_TOPOCLAW` (optional, default `true`)
- `TOPO_GROUP_MESSAGE` (optional): first message content
- `TOPO_SEND_FIRST_MESSAGE` (optional bool): defaults to true only when message exists
- `TOPO_GROUP_SENDER` (optional): first message sender label, default `TopoClaw`
- `CUSTOMER_SERVICE_URL` (optional)
- `VITE_MOBILE_AGENT_CUSTOMER_SERVICE_URL` (recommended)

## Canonical API Flow

1. Resolve owner/group/friends/assistants from inputs.
2. `POST /api/groups/create`.
3. Ensure `free_discovery=true`; if false, call `POST /api/groups/update-config`.
4. Add assistants with `POST /api/groups/add-assistant`.
5. If `group_manager_assistant_display_id` is set, call `POST /api/groups/update-assistant-config`.
6. If enabled, send first message via `POST /api/groups/send-assistant-message`.
7. Fetch final state via `GET /api/groups/{groupId}` and return structured JSON.

## Error Handling

- Missing owner IMEI -> fail fast
- Missing service URL -> fail fast
- Empty group name -> fail fast
- `TOPO_SEND_FIRST_MESSAGE=true` with empty message -> fail fast
- Group create failure -> fail fast
- First message send failure -> fail fast
- Assistant add failures -> include per-assistant result in output
---
name: create-group-and-send-message
description: Unified group creation skill: supports multiple friends and assistants, and can optionally send the first message.
metadata: {"topoclaw":{"emoji":"⚡","requires":{"bins":["python"]}}}
---

# Create Group And Send Message

Use this as the default group-creation skill.

It supports both:
- create group only
- create group + send first message

This skill supersedes legacy `create-group`.

## Inputs

- `TOPO_IMEI` (required): caller IMEI
- `TOPO_OWNER_IMEI` (optional): owner override, default caller IMEI
- `TOPO_GROUP_NAME` (optional): group name, default `我的新群组`

Members (can be mixed):
- `TOPO_FRIEND_IMEIS` (optional): JSON array or comma-separated IMEIs
- `TOPO_TARGET_FRIEND` (optional, backward-compatible): single selector (`昵称/姓名/IMEI`)
- `TOPO_TARGET_FRIENDS` (optional): JSON array or comma-separated selectors (`昵称/姓名/IMEI`)

Assistants:
- `TOPO_ASSISTANT_DISPLAY_IDS` (optional): JSON array or comma-separated display IDs
- `TOPO_ASSISTANT_IDS` (optional, deprecated): backward-compatible alias
- `TOPO_GROUP_MANAGER_ASSISTANT_DISPLAY_ID` (optional): assistant display ID to upgrade to GroupManager capability
- `TOPO_GROUP_MANAGER_ASSISTANT_ID` (optional, deprecated): backward-compatible alias
- `TOPO_AUTO_ADD_FRIEND_TOPOCLAW` (optional, default `true`): auto-add owner + member default TopoClaw assistants

First message:
- `TOPO_GROUP_MESSAGE` (optional): first message content
- `TOPO_SEND_FIRST_MESSAGE` (optional bool): default is `true` when message exists, otherwise `false`
- `TOPO_GROUP_SENDER` (optional): sender label when sending first message, default `TopoClaw`

Service URL:
- `CUSTOMER_SERVICE_URL` (optional)
- `VITE_MOBILE_AGENT_CUSTOMER_SERVICE_URL` (recommended)

## Output

- `success`
- `owner_imei`
- `groupId` / `groupName`
- `friend_imeis_final`
- `assistant_display_ids_final`
- `free_discovery` (should be `true`)
- `send_first_message` / `send_raw`
- `assistant_add_results`
- `group` (final group data)

## Reference Script

```python
import json
import os
import requests

caller_imei = os.getenv("TOPO_IMEI", "").strip() or os.getenv("IMEI", "").strip()
owner_imei = os.getenv("TOPO_OWNER_IMEI", "").strip() or caller_imei
group_name = os.getenv("TOPO_GROUP_NAME", "").strip() or "我的新群组"
base_url = (
    os.getenv("CUSTOMER_SERVICE_URL", "").strip()
    or os.getenv("VITE_MOBILE_AGENT_CUSTOMER_SERVICE_URL", "").strip()
).rstrip("/")

def _env_list(name: str):
    raw = os.getenv(name, "").strip()
    if not raw:
        return []
    try:
        val = json.loads(raw)
        if isinstance(val, list):
            return [str(x).strip() for x in val if str(x).strip()]
    except Exception:
        pass
    return [x.strip() for x in raw.split(",") if x.strip()]

def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")

def _norm(s: str) -> str:
    return str(s or "").strip().lower()

def _normalize_base_url(url: str) -> str:
    return str(url or "").strip().lower().rstrip("/")

if not owner_imei:
    raise RuntimeError("Missing TOPO_IMEI/TOPO_OWNER_IMEI")
if not base_url:
    raise RuntimeError("Missing customer_service URL")
if not group_name.strip():
    raise RuntimeError("group_name cannot be empty")

friend_imeis = _env_list("TOPO_FRIEND_IMEIS")
target_friend = os.getenv("TOPO_TARGET_FRIEND", "").strip()
target_friends = _env_list("TOPO_TARGET_FRIENDS")
assistant_display_ids = _env_list("TOPO_ASSISTANT_DISPLAY_IDS") or _env_list("TOPO_ASSISTANT_IDS")
group_manager_display_id = (
    os.getenv("TOPO_GROUP_MANAGER_ASSISTANT_DISPLAY_ID", "").strip()
    or os.getenv("TOPO_GROUP_MANAGER_ASSISTANT_ID", "").strip()
)
auto_add_friend_topoclaw = _env_bool("TOPO_AUTO_ADD_FRIEND_TOPOCLAW", True)
group_message = os.getenv("TOPO_GROUP_MESSAGE", "").strip()
send_env_raw = os.getenv("TOPO_SEND_FIRST_MESSAGE", "").strip()
send_first_message = _env_bool("TOPO_SEND_FIRST_MESSAGE", bool(group_message)) if send_env_raw else bool(group_message)
group_sender = os.getenv("TOPO_GROUP_SENDER", "").strip() or "TopoClaw"
if send_first_message and not group_message:
    raise RuntimeError("TOPO_SEND_FIRST_MESSAGE=true but TOPO_GROUP_MESSAGE is empty")

def get(path: str, params=None):
    url = f"{base_url}/{path.lstrip('/')}"
    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()
    return r.json()

def post(path: str, body: dict):
    url = f"{base_url}/{path.lstrip('/')}"
    r = requests.post(url, json=body, timeout=20)
    r.raise_for_status()
    return r.json()

def _is_customer_topoclaw_assistant(item: dict) -> bool:
    aid = str(item.get("id") or "").strip().lower()
    did = str(item.get("displayId") or "").strip().lower()
    name = str(item.get("name") or "").strip().lower()
    bu = _normalize_base_url(item.get("baseUrl") or "")
    if "customer_topoclaw" in aid or "customer_topoclaw" in did:
        return True
    return ("topoclaw" in aid or "topoclaw" in name) and bu != "topoclaw://relay"

def _fetch_custom_assistants(target_imei: str):
    data = get("/api/custom-assistants", {"imei": target_imei})
    arr = data.get("assistants") or []
    return arr if isinstance(arr, list) else []

def _resolve_default_topoclaw_assistant(target_imei: str):
    assistants = _fetch_custom_assistants(target_imei)
    preferred, relay_fallback = [], []
    for item in assistants:
        if not isinstance(item, dict):
            continue
        if _is_customer_topoclaw_assistant(item):
            preferred.append(item)
        elif _normalize_base_url(item.get("baseUrl") or "") == "topoclaw://relay":
            relay_fallback.append(item)
    for item in (preferred or relay_fallback):
        did = str(item.get("displayId") or "").strip()
        if not did:
            continue
        return {
            "owner_imei": target_imei,
            "display_id": did,
            "assistant_id_internal": str(item.get("id") or "").strip(),
            "name": str(item.get("name") or "TopoClaw").strip() or "TopoClaw",
            "base_url": str(item.get("baseUrl") or "topoclaw://relay"),
            "intro": str(item.get("intro") or ""),
            "avatar": str(item.get("avatar") or ""),
            "capabilities": item.get("capabilities") or ["chat", "skills", "cron"],
            "multi_session": bool(item.get("multiSessionEnabled", True)),
        }
    return None

def _resolve_assistant_by_display_id(target_imei: str, display_id: str):
    did = str(display_id or "").strip()
    if not did:
        return None
    for item in _fetch_custom_assistants(target_imei):
        if not isinstance(item, dict):
            continue
        if str(item.get("displayId") or "").strip() != did:
            continue
        return {
            "owner_imei": target_imei,
            "display_id": did,
            "assistant_id_internal": str(item.get("id") or "").strip(),
            "name": str(item.get("name") or did),
            "base_url": str(item.get("baseUrl") or ""),
            "intro": str(item.get("intro") or ""),
            "avatar": str(item.get("avatar") or ""),
            "capabilities": item.get("capabilities") or ["chat"],
            "multi_session": bool(item.get("multiSessionEnabled", True)),
        }
    return None

def _resolve_friend_selectors(selectors: list[str]):
    if not selectors:
        return [], []
    data = get("/api/friends/list", {"imei": owner_imei})
    friends = data.get("friends") or []
    if not isinstance(friends, list):
        friends = []
    resolved, errors = [], []
    for selector in selectors:
        q = _norm(selector)
        exact, contains = [], []
        for f in friends:
            if not isinstance(f, dict):
                continue
            imei = str(f.get("imei") or "").strip()
            nickname = str(f.get("nickname") or "").strip()
            candidates = [_norm(imei), _norm(nickname)]
            if q in candidates:
                exact.append({"imei": imei, "nickname": nickname or imei, "query": selector})
            elif any(q and q in c for c in candidates if c):
                contains.append({"imei": imei, "nickname": nickname or imei, "query": selector})
        if len(exact) == 1:
            resolved.append(exact[0])
        elif len(exact) > 1:
            errors.append({"query": selector, "error": "ambiguous_exact", "matches": exact})
        elif len(contains) == 1:
            resolved.append(contains[0])
        elif len(contains) > 1:
            errors.append({"query": selector, "error": "ambiguous_contains", "matches": contains})
        else:
            errors.append({"query": selector, "error": "not_found"})
    return resolved, errors

friend_selectors = ([target_friend] if target_friend else []) + [x for x in target_friends if str(x).strip()]
resolved_friends, friend_selector_errors = _resolve_friend_selectors(friend_selectors)
member_imeis = list(dict.fromkeys(
    [str(x).strip() for x in friend_imeis if str(x).strip()]
    + [str(x.get("imei") or "").strip() for x in resolved_friends if str(x.get("imei") or "").strip()]
))

assistant_spec_map = {}
assistant_display_resolve_errors = []
for did in [str(x).strip() for x in assistant_display_ids if str(x).strip()]:
    spec = _resolve_assistant_by_display_id(owner_imei, did)
    if spec:
        assistant_spec_map[spec["display_id"]] = spec
    else:
        assistant_display_resolve_errors.append({"display_id": did, "error": "display_id_not_found"})

auto_friend_topoclaw_assistants = []
auto_friend_topoclaw_errors = []
if auto_add_friend_topoclaw:
    for m_imei in list(dict.fromkeys([owner_imei, *member_imeis])):
        try:
            spec = _resolve_default_topoclaw_assistant(m_imei)
            if not spec:
                auto_friend_topoclaw_errors.append({"member_imei": m_imei, "error": "default_topoclaw_not_found"})
                continue
            assistant_spec_map[spec["display_id"]] = spec
            auto_friend_topoclaw_assistants.append({
                "member_imei": m_imei,
                "display_id": spec["display_id"],
                "assistant_id_internal": spec["assistant_id_internal"],
            })
        except Exception as e:
            auto_friend_topoclaw_errors.append({"member_imei": m_imei, "error": str(e)})

if group_manager_display_id and group_manager_display_id not in assistant_spec_map:
    spec = _resolve_assistant_by_display_id(owner_imei, group_manager_display_id)
    if spec:
        assistant_spec_map[spec["display_id"]] = spec
    else:
        assistant_display_resolve_errors.append({"display_id": group_manager_display_id, "error": "group_manager_resolve_failed"})

assistant_display_ids_final = list(assistant_spec_map.keys())
create_res = post("/api/groups/create", {
    "imei": owner_imei,
    "name": group_name.strip(),
    "memberImeis": member_imeis,
    "assistantEnabled": bool(assistant_display_ids_final),
})
if not create_res.get("success"):
    raise RuntimeError(f"Create group failed: {create_res}")
group_id = str(create_res.get("groupId") or "").strip()
if not group_id:
    raise RuntimeError(f"Missing groupId from create result: {create_res}")

group = create_res.get("group") or {}
free_discovery = bool(group.get("free_discovery", False))
if not free_discovery:
    cfg_res = post("/api/groups/update-config", {"imei": owner_imei, "groupId": group_id, "freeDiscovery": True})
    if not cfg_res.get("success"):
        raise RuntimeError(f"Enable freeDiscovery failed: {cfg_res}")
    refreshed = get(f"/api/groups/{group_id}")
    group = (refreshed or {}).get("group") or group
    free_discovery = bool(group.get("free_discovery", False))

assistant_results = []
for display_id in assistant_display_ids_final:
    spec = assistant_spec_map.get(display_id) or {}
    internal_id = str(spec.get("assistant_id_internal") or "").strip() or display_id
    item = {"displayId": display_id, "assistantId_internal": internal_id, "owner_imei": spec.get("owner_imei"), "success": False}
    try:
        add_res = post("/api/groups/add-assistant", {
            "imei": owner_imei,
            "groupId": group_id,
            "assistantId": internal_id,
            "creatorImei": spec.get("owner_imei") or owner_imei,
            "displayId": display_id,
            "baseUrl": spec.get("base_url") or "",
            "name": spec.get("name") or display_id,
            "capabilities": spec.get("capabilities") or ["chat"],
            "intro": spec.get("intro") or "",
            "avatar": spec.get("avatar") or "",
            "multiSession": bool(spec.get("multi_session", True)),
        })
        item["success"] = bool(add_res.get("success"))
        item["add_raw"] = add_res
        if group_manager_display_id and display_id == group_manager_display_id and item["success"]:
            gm_res = post("/api/groups/update-assistant-config", {
                "imei": owner_imei,
                "groupId": group_id,
                "assistantId": internal_id,
                "capabilities": ["chat", "group_manager"],
            })
            item["group_manager_config_updated"] = bool(gm_res.get("success"))
            item["group_manager_update_raw"] = gm_res
    except Exception as e:
        item["error"] = str(e)
    assistant_results.append(item)

send_raw = None
if send_first_message:
    send_raw = post("/api/groups/send-assistant-message", {
        "imei": owner_imei,
        "groupId": group_id,
        "content": group_message,
        "sender": group_sender,
    })
    if not send_raw.get("success"):
        raise RuntimeError(f"Send first group message failed: {send_raw}")

group_detail = get(f"/api/groups/{group_id}") if group_id else {}
result = {
    "success": True,
    "caller_imei": caller_imei or None,
    "owner_imei": owner_imei,
    "friend_selectors": friend_selectors,
    "friend_selector_errors": friend_selector_errors,
    "friend_imeis_final": member_imeis,
    "assistant_display_resolve_errors": assistant_display_resolve_errors,
    "auto_add_friend_topoclaw": bool(auto_add_friend_topoclaw),
    "auto_friend_topoclaw_assistants": auto_friend_topoclaw_assistants,
    "auto_friend_topoclaw_errors": auto_friend_topoclaw_errors,
    "assistant_display_ids_final": assistant_display_ids_final,
    "group_manager_assistant_display_id": group_manager_display_id or None,
    "groupId": group_id,
    "groupName": (group_detail.get("group") or {}).get("name") if isinstance(group_detail, dict) else group_name,
    "free_discovery": free_discovery,
    "create": create_res,
    "assistant_add_results": assistant_results,
    "send_first_message": bool(send_first_message),
    "send_raw": send_raw,
    "group": group_detail.get("group") if isinstance(group_detail, dict) else group_detail,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
```
---
name: create-group-and-send-message
description: Unified group creation skill: create a group with multiple friends and assistants, optionally send the first message in the same call.
metadata: {"topoclaw":{"emoji":"⚡","requires":{"bins":["python"]}}}
---

# Create Group And Send Message

Use this skill as the primary path for group creation workflows.

It now covers both modes:
- Create group only (no first message)
- Create group + send first message

This skill supersedes legacy `create-group`.

## Inputs

- `TOPO_IMEI` (required): caller IMEI
  - in TopoDesktop built-in assistant chats, runtime context auto-injects the current logged-in IMEI
- `TOPO_OWNER_IMEI` (optional): group owner IMEI override (default: caller IMEI)
- `TOPO_GROUP_NAME` (optional): group name (default `我的新群组`)

Members (you can mix multiple sources):
- `TOPO_FRIEND_IMEIS` (optional): friend IMEIs list (JSON array or comma-separated)
- `TOPO_TARGET_FRIEND` (optional, backward-compatible): single selector (`昵称/姓名/IMEI`)
- `TOPO_TARGET_FRIENDS` (optional): multiple selectors (JSON array or comma-separated), each supports `昵称/姓名/IMEI`

Assistants:
- `TOPO_ASSISTANT_DISPLAY_IDS` (optional): assistant display IDs (JSON array or comma-separated)
- `TOPO_ASSISTANT_IDS` (optional, deprecated): backward-compatible alias of display IDs
- `TOPO_GROUP_MANAGER_ASSISTANT_DISPLAY_ID` (optional): mark one assistant as GroupManager
- `TOPO_GROUP_MANAGER_ASSISTANT_ID` (optional, deprecated): backward-compatible alias
- `TOPO_AUTO_ADD_FRIEND_TOPOCLAW` (optional, default `true`): auto-add owner + all involved friends' default TopoClaw assistants

First message controls:
- `TOPO_GROUP_MESSAGE` (optional): first message content
- `TOPO_SEND_FIRST_MESSAGE` (optional): `true/false`
  - default behavior:
    - if `TOPO_GROUP_MESSAGE` is non-empty -> send first message
    - else -> create only
- `TOPO_GROUP_SENDER` (optional, default `TopoClaw`): sender label when sending first message

Service URL:
- `CUSTOMER_SERVICE_URL` (optional): service base URL override
- `VITE_MOBILE_AGENT_CUSTOMER_SERVICE_URL` (recommended): default customer_service base URL from TopoDesktop `.env.local`

## Output

Structured JSON:
- `success`
- `owner_imei`
- `groupId`
- `groupName`
- `friend_imeis_final`
- `assistant_display_ids_final`
- `free_discovery` (should be `true`)
- `send_first_message` / `send_raw` (when enabled)
- `assistant_add_results`
- `group` (final group details)

## Reference Script

```python
import os
import json
import requests

caller_imei = os.getenv("TOPO_IMEI", "").strip() or os.getenv("IMEI", "").strip()
base_url = (
    os.getenv("CUSTOMER_SERVICE_URL", "").strip()
    or os.getenv("VITE_MOBILE_AGENT_CUSTOMER_SERVICE_URL", "").strip()
).rstrip("/")

def _env_list(name: str):
    """Support JSON array or comma-separated string."""
    raw = os.getenv(name, "").strip()
    if not raw:
        return []
    try:
        val = json.loads(raw)
        if isinstance(val, list):
            return [str(x).strip() for x in val if str(x).strip()]
    except Exception:
        pass
    return [x.strip() for x in raw.split(",") if x.strip()]

def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")

def _norm(s: str) -> str:
    return str(s or "").strip().lower()

def _normalize_base_url(url: str) -> str:
    return str(url or "").strip().lower().rstrip("/")

owner_imei = os.getenv("TOPO_OWNER_IMEI", "").strip() or caller_imei
group_name = os.getenv("TOPO_GROUP_NAME", "").strip() or "我的新群组"
friend_imeis = _env_list("TOPO_FRIEND_IMEIS")
target_friend = os.getenv("TOPO_TARGET_FRIEND", "").strip()
target_friends = _env_list("TOPO_TARGET_FRIENDS")
assistant_display_ids = _env_list("TOPO_ASSISTANT_DISPLAY_IDS")
if not assistant_display_ids:
    assistant_display_ids = _env_list("TOPO_ASSISTANT_IDS")  # backward-compatible
group_manager_assistant_display_id = os.getenv("TOPO_GROUP_MANAGER_ASSISTANT_DISPLAY_ID", "").strip()
if not group_manager_assistant_display_id:
    group_manager_assistant_display_id = os.getenv("TOPO_GROUP_MANAGER_ASSISTANT_ID", "").strip()  # backward-compatible
auto_add_friend_topoclaw = _env_bool("TOPO_AUTO_ADD_FRIEND_TOPOCLAW", True)
group_message = os.getenv("TOPO_GROUP_MESSAGE", "").strip()
send_first_message_env_raw = os.getenv("TOPO_SEND_FIRST_MESSAGE", "").strip()
send_first_message = _env_bool("TOPO_SEND_FIRST_MESSAGE", bool(group_message)) if send_first_message_env_raw else bool(group_message)
group_sender = os.getenv("TOPO_GROUP_SENDER", "").strip() or "TopoClaw"

if not owner_imei:
    raise RuntimeError("Missing TOPO_IMEI/TOPO_OWNER_IMEI")
if not base_url:
    raise RuntimeError("Missing customer_service URL: set VITE_MOBILE_AGENT_CUSTOMER_SERVICE_URL in TopoDesktop/.env.local")
if not group_name.strip():
    raise RuntimeError("group_name cannot be empty")
if send_first_message and not group_message:
    raise RuntimeError("TOPO_SEND_FIRST_MESSAGE=true but TOPO_GROUP_MESSAGE is empty")

def get(path: str, params=None):
    url = f"{base_url}/{path.lstrip('/')}"
    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()
    return r.json()

def post(path: str, body: dict):
    url = f"{base_url}/{path.lstrip('/')}"
    r = requests.post(url, json=body, timeout=20)
    r.raise_for_status()
    return r.json()

def _is_customer_topoclaw_assistant(item: dict) -> bool:
    if not isinstance(item, dict):
        return False
    aid = str(item.get("id") or "").strip().lower()
    did = str(item.get("displayId") or "").strip().lower()
    name = str(item.get("name") or "").strip().lower()
    base_u = _normalize_base_url(item.get("baseUrl") or "")
    if "customer_topoclaw" in aid or "customer_topoclaw" in did:
        return True
    if ("topoclaw" in aid or "topoclaw" in name) and base_u != "topoclaw://relay":
        return True
    return False

def _fetch_custom_assistants(target_imei: str):
    try:
        res = get("/api/custom-assistants", {"imei": target_imei})
        return res.get("assistants") or [], None
    except Exception as e:
        return [], f"fetch_custom_assistants_failed: {e}"

def _resolve_default_topoclaw_assistant(target_imei: str):
    assistants, err = _fetch_custom_assistants(target_imei)
    if err:
        return None, err
    preferred = []
    relay_fallback = []
    for item in assistants:
        if not isinstance(item, dict):
            continue
        if _is_customer_topoclaw_assistant(item):
            preferred.append(item)
            continue
        if _normalize_base_url(item.get("baseUrl") or "") == "topoclaw://relay":
            relay_fallback.append(item)
    candidates = preferred or relay_fallback
    for item in candidates:
        did = str(item.get("displayId") or "").strip()
        if not did:
            continue
        return {
            "owner_imei": target_imei,
            "display_id": did,
            "assistant_id_internal": str(item.get("id") or "").strip(),
            "name": str(item.get("name") or "TopoClaw").strip() or "TopoClaw",
            "base_url": str(item.get("baseUrl") or "topoclaw://relay"),
            "intro": str(item.get("intro") or ""),
            "avatar": str(item.get("avatar") or ""),
            "capabilities": item.get("capabilities") or ["chat", "skills", "cron"],
            "multi_session": bool(item.get("multiSessionEnabled", True)),
        }, None
    return None, "default_topoclaw_not_found"

def _ensure_default_topoclaw_via_profile(target_imei: str):
    imei = str(target_imei or "").strip()
    if not imei:
        return False, "empty_member_imei", None
    try:
        url = f"{base_url}/api/profile/{imei}"
        r = requests.post(url, data={}, timeout=20)
        r.raise_for_status()
        data = r.json()
        if isinstance(data, dict) and data.get("success"):
            return True, None, data
        return False, f"profile_update_unsuccess: {data}", data
    except Exception as e:
        return False, f"ensure_default_topoclaw_via_profile_failed: {e}", None

def _resolve_assistant_by_display_id(target_imei: str, display_id: str):
    did = str(display_id or "").strip()
    if not did:
        return None, "empty_display_id"
    assistants, err = _fetch_custom_assistants(target_imei)
    if err:
        return None, err
    for item in assistants:
        if not isinstance(item, dict):
            continue
        if str(item.get("displayId") or "").strip() != did:
            continue
        return {
            "owner_imei": target_imei,
            "display_id": did,
            "assistant_id_internal": str(item.get("id") or "").strip(),
            "name": str(item.get("name") or did),
            "base_url": str(item.get("baseUrl") or ""),
            "intro": str(item.get("intro") or ""),
            "avatar": str(item.get("avatar") or ""),
            "capabilities": item.get("capabilities") or ["chat"],
            "multi_session": bool(item.get("multiSessionEnabled", True)),
        }, None
    return None, "display_id_not_found"

def _upsert_assistant_spec(spec_map: dict, spec: dict):
    key = str(spec.get("display_id") or "").strip()
    if not key:
        return
    spec_map[key] = spec

def _resolve_friend_selector(selectors: list[str]):
    if not selectors:
        return [], []
    data = get("/api/friends/list", {"imei": owner_imei})
    friends = data.get("friends") or []
    if not isinstance(friends, list):
        friends = []
    resolved = []
    errors = []
    for selector in selectors:
        q = _norm(selector)
        if not q:
            continue
        exact = []
        contains = []
        for f in friends:
            if not isinstance(f, dict):
                continue
            imei = str(f.get("imei") or "").strip()
            nickname = str(f.get("nickname") or "").strip()
            candidates = [imei, nickname]
            candidates_norm = [_norm(x) for x in candidates if str(x or "").strip()]
            if q in candidates_norm:
                exact.append({"imei": imei, "nickname": nickname or imei, "query": selector})
                continue
            if any(q in c for c in candidates_norm):
                contains.append({"imei": imei, "nickname": nickname or imei, "query": selector})
        if len(exact) == 1:
            resolved.append(exact[0])
        elif len(exact) > 1:
            errors.append({"query": selector, "error": "ambiguous_exact", "matches": exact})
        elif len(contains) == 1:
            resolved.append(contains[0])
        elif len(contains) > 1:
            errors.append({"query": selector, "error": "ambiguous_contains", "matches": contains})
        else:
            errors.append({"query": selector, "error": "not_found"})
    return resolved, errors

friend_selectors = []
if target_friend:
    friend_selectors.append(target_friend)
friend_selectors.extend([x for x in target_friends if str(x).strip()])
resolved_friends, friend_selector_errors = _resolve_friend_selector(friend_selectors)

member_imeis = [str(x).strip() for x in friend_imeis if str(x).strip()]
member_imeis.extend([str(x.get("imei") or "").strip() for x in resolved_friends if str(x.get("imei") or "").strip()])
member_imeis = list(dict.fromkeys(member_imeis))

assistant_spec_map = {}
manual_display_id_resolve_errors = []
for did in [str(x).strip() for x in assistant_display_ids if str(x).strip()]:
    spec, err = _resolve_assistant_by_display_id(owner_imei, did)
    if spec:
        _upsert_assistant_spec(assistant_spec_map, spec)
    else:
        manual_display_id_resolve_errors.append({"display_id": did, "error": err})

auto_friend_topoclaw_assistants = []
auto_friend_topoclaw_errors = []
auto_friend_topoclaw_ensure_attempts = []
if auto_add_friend_topoclaw:
    auto_target_imeis = list(dict.fromkeys([owner_imei, *member_imeis]))
    for m_imei in auto_target_imeis:
        spec, err = _resolve_default_topoclaw_assistant(m_imei)
        if not spec and err == "default_topoclaw_not_found":
            ensured, ensure_err, ensure_raw = _ensure_default_topoclaw_via_profile(m_imei)
            attempt = {
                "member_imei": m_imei,
                "ensure_called": True,
                "ensure_success": bool(ensured),
            }
            if ensure_err:
                attempt["ensure_error"] = ensure_err
            if ensure_raw is not None:
                attempt["ensure_raw"] = ensure_raw
            if ensured:
                retry_spec, retry_err = _resolve_default_topoclaw_assistant(m_imei)
                attempt["retry_success"] = bool(retry_spec)
                if retry_spec:
                    spec, err = retry_spec, None
                    attempt["retry_display_id"] = retry_spec.get("display_id")
                else:
                    err = f"default_topoclaw_not_found_after_ensure:{retry_err}"
                    attempt["retry_error"] = retry_err
            auto_friend_topoclaw_ensure_attempts.append(attempt)
        if spec:
            _upsert_assistant_spec(assistant_spec_map, spec)
            auto_friend_topoclaw_assistants.append(
                {
                    "member_imei": m_imei,
                    "display_id": spec["display_id"],
                    "assistant_id_internal": spec["assistant_id_internal"],
                }
            )
        else:
            auto_friend_topoclaw_errors.append({"member_imei": m_imei, "error": err})

if group_manager_assistant_display_id and group_manager_assistant_display_id not in assistant_spec_map:
    gm_spec, gm_err = _resolve_assistant_by_display_id(owner_imei, group_manager_assistant_display_id)
    if gm_spec:
        _upsert_assistant_spec(assistant_spec_map, gm_spec)
    else:
        manual_display_id_resolve_errors.append(
            {"display_id": group_manager_assistant_display_id, "error": f"group_manager_resolve_failed:{gm_err}"}
        )

assistant_display_ids_final = list(assistant_spec_map.keys())

create_res = post(
    "/api/groups/create",
    {
        "imei": owner_imei,
        "name": group_name.strip(),
        "memberImeis": member_imeis,
        "assistantEnabled": bool(assistant_display_ids_final),
    },
)
if not create_res.get("success"):
    raise RuntimeError(f"Create group failed: {create_res}")

group_id = str(create_res.get("groupId") or "").strip()
if not group_id:
    raise RuntimeError(f"Missing groupId from create result: {create_res}")

group = create_res.get("group") or {}
free_discovery = bool(group.get("free_discovery", False))
if not free_discovery:
    cfg_res = post(
        "/api/groups/update-config",
        {"imei": owner_imei, "groupId": group_id, "freeDiscovery": True},
    )
    if not cfg_res.get("success"):
        raise RuntimeError(f"Enable freeDiscovery failed: {cfg_res}")
    detail_after_cfg = get(f"/api/groups/{group_id}")
    group = (detail_after_cfg or {}).get("group") or group
    free_discovery = bool(group.get("free_discovery", False))

assistant_results = []
for display_id in assistant_display_ids_final:
    spec = assistant_spec_map.get(display_id) or {}
    internal_id = str(spec.get("assistant_id_internal") or "").strip() or display_id
    item = {
        "displayId": display_id,
        "assistantId_internal": internal_id,
        "owner_imei": spec.get("owner_imei"),
        "success": False,
    }
    try:
        payload = {
            "imei": owner_imei,
            "groupId": group_id,
            "assistantId": internal_id,
            "creatorImei": spec.get("owner_imei") or owner_imei,
            "displayId": display_id,
            "baseUrl": spec.get("base_url") or "",
            "name": spec.get("name") or display_id,
            "capabilities": spec.get("capabilities") or ["chat"],
            "intro": spec.get("intro") or "",
            "avatar": spec.get("avatar") or "",
            "multiSession": bool(spec.get("multi_session", True)),
        }
        add_res = post("/api/groups/add-assistant", payload)
        item["success"] = bool(add_res.get("success"))
        item["add_raw"] = add_res
        if group_manager_assistant_display_id and display_id == group_manager_assistant_display_id and item["success"]:
            try:
                gm_res = post(
                    "/api/groups/update-assistant-config",
                    {
                        "imei": owner_imei,
                        "groupId": group_id,
                        "assistantId": internal_id,
                        "capabilities": ["chat", "group_manager"],
                    },
                )
                item["group_manager_config_updated"] = bool(gm_res.get("success"))
                item["group_manager_update_raw"] = gm_res
            except Exception as ge:
                item["group_manager_config_updated"] = False
                item["group_manager_update_error"] = str(ge)
    except Exception as e:
        item["error"] = str(e)
    assistant_results.append(item)

send_raw = None
if send_first_message:
    send_raw = post(
        "/api/groups/send-assistant-message",
        {
            "imei": owner_imei,
            "groupId": group_id,
            "content": group_message,
            "sender": group_sender,
        },
    )
    if not send_raw.get("success"):
        raise RuntimeError(f"Send first group message failed: {send_raw}")

group_detail = get(f"/api/groups/{group_id}") if group_id else {}

result = {
    "success": True,
    "caller_imei": caller_imei or None,
    "owner_imei": owner_imei,
    "friend_selectors": friend_selectors,
    "friend_selector_errors": friend_selector_errors,
    "friend_imeis_final": member_imeis,
    "manual_display_id_resolve_errors": manual_display_id_resolve_errors,
    "auto_add_friend_topoclaw": bool(auto_add_friend_topoclaw),
    "auto_friend_topoclaw_assistants": auto_friend_topoclaw_assistants,
    "auto_friend_topoclaw_errors": auto_friend_topoclaw_errors,
    "auto_friend_topoclaw_ensure_attempts": auto_friend_topoclaw_ensure_attempts,
    "assistant_display_ids_final": assistant_display_ids_final,
    "group_manager_assistant_display_id": group_manager_assistant_display_id or None,
    "groupId": group_id,
    "groupName": (group_detail.get("group") or {}).get("name") if isinstance(group_detail, dict) else group_name,
    "free_discovery": free_discovery,
    "create": create_res,
    "assistant_add_results": assistant_results,
    "send_first_message": bool(send_first_message),
    "send_raw": send_raw,
    "group": group_detail.get("group") if isinstance(group_detail, dict) else group_detail,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
```
---
name: create-group-and-send-message
description: Create a group with one friend (resolved by name/IMEI) and send the first group message in one shot via customer_service APIs.
metadata: {"topoclaw":{"emoji":"⚡","requires":{"bins":["python"]}}}
---

# Create Group And Send Message

Use this skill when user intent is a single action chain:
- "和某某建个群"
- "拉某某进群并发一句话"

This skill is the high-level fast path and should be preferred over multi-step manual tool orchestration.
By default, it auto-adds owner + involved friends' digital-clone TopoClaw assistants into the new group.

## Inputs

- `TOPO_IMEI` (required): caller IMEI
  - in TopoDesktop built-in assistant chats, runtime context auto-injects the current logged-in IMEI
- `TOPO_TARGET_FRIEND` (required): friend selector (`昵称/姓名/IMEI`)
- `TOPO_GROUP_NAME` (optional): group name, default `"{friend_name}的小群"`
- `TOPO_GROUP_MESSAGE` (required): first group message to send
- `TOPO_GROUP_SENDER` (optional, default `TopoClaw`): sender label shown in group
- `TOPO_AUTO_ADD_FRIEND_TOPOCLAW` (optional, default `true`): auto-add owner + involved friends' default TopoClaw assistants
- `CUSTOMER_SERVICE_URL` (optional): service base URL override
- `VITE_MOBILE_AGENT_CUSTOMER_SERVICE_URL` (recommended): default customer_service base URL from TopoDesktop `.env.local`

## Output

Structured JSON:
- `success`
- `owner_imei`
- `target_friend` (`query/nickname/imei`)
- `groupId`
- `groupName`
- `free_discovery` (should be `true`)
- `auto_friend_topoclaw_assistants`
- `auto_friend_topoclaw_errors`
- `create_raw`
- `send_raw`

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

target_friend = os.getenv("TOPO_TARGET_FRIEND", "").strip()
group_name = os.getenv("TOPO_GROUP_NAME", "").strip()
group_message = os.getenv("TOPO_GROUP_MESSAGE", "").strip()
group_sender = os.getenv("TOPO_GROUP_SENDER", "").strip() or "TopoClaw"
auto_add_friend_topoclaw = os.getenv("TOPO_AUTO_ADD_FRIEND_TOPOCLAW", "").strip().lower() not in ("0", "false", "no", "off")

if not owner_imei:
    raise RuntimeError("Missing TOPO_IMEI (current caller IMEI)")
if not base_url:
    raise RuntimeError("Missing customer_service URL: set VITE_MOBILE_AGENT_CUSTOMER_SERVICE_URL in TopoDesktop/.env.local")
if not target_friend:
    raise RuntimeError("Missing TOPO_TARGET_FRIEND")
if not group_message:
    raise RuntimeError("Missing TOPO_GROUP_MESSAGE")

def _norm(s: str) -> str:
    return str(s or "").strip().lower()

def get(path: str, params=None):
    url = f"{base_url}/{path.lstrip('/')}"
    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()
    return r.json()

def post(path: str, body: dict):
    url = f"{base_url}/{path.lstrip('/')}"
    r = requests.post(url, json=body, timeout=20)
    r.raise_for_status()
    return r.json()

def _normalize_base_url(url: str) -> str:
    return str(url or "").strip().lower().rstrip("/")

def _is_customer_topoclaw_assistant(item: dict) -> bool:
    if not isinstance(item, dict):
        return False
    aid = str(item.get("id") or "").strip().lower()
    did = str(item.get("displayId") or "").strip().lower()
    name = str(item.get("name") or "").strip().lower()
    base_u = _normalize_base_url(item.get("baseUrl") or "")
    if "customer_topoclaw" in aid or "customer_topoclaw" in did:
        return True
    if ("topoclaw" in aid or "topoclaw" in name) and base_u != "topoclaw://relay":
        return True
    return False

def _resolve_default_topoclaw_assistant(target_imei: str):
    data = get("/api/custom-assistants", {"imei": target_imei})
    assistants = data.get("assistants") or []
    preferred = []
    relay_fallback = []
    for item in assistants:
        if not isinstance(item, dict):
            continue
        if _is_customer_topoclaw_assistant(item):
            preferred.append(item)
            continue
        if _normalize_base_url(item.get("baseUrl") or "") == "topoclaw://relay":
            relay_fallback.append(item)
    candidates = preferred or relay_fallback
    for item in candidates:
        did = str(item.get("displayId") or "").strip()
        if not did:
            continue
        return {
            "owner_imei": target_imei,
            "display_id": did,
            "assistant_id_internal": str(item.get("id") or "").strip(),
            "name": str(item.get("name") or "TopoClaw").strip() or "TopoClaw",
            "base_url": str(item.get("baseUrl") or "topoclaw://relay"),
            "intro": str(item.get("intro") or ""),
            "avatar": str(item.get("avatar") or ""),
            "capabilities": item.get("capabilities") or ["chat", "skills", "cron"],
            "multi_session": bool(item.get("multiSessionEnabled", True)),
        }
    return None

friends_raw = get("/api/friends/list", {"imei": owner_imei})
friends = friends_raw.get("friends") or []
if not isinstance(friends, list):
    friends = []

q = _norm(target_friend)
exact = []
contains = []
for f in friends:
    if not isinstance(f, dict):
        continue
    imei = str(f.get("imei") or "").strip()
    nickname = str(f.get("nickname") or "").strip()
    candidates = [imei, nickname]
    candidates_norm = [_norm(x) for x in candidates if str(x or "").strip()]
    if q in candidates_norm:
        exact.append({"imei": imei, "nickname": nickname or imei})
        continue
    if any(q and q in c for c in candidates_norm):
        contains.append({"imei": imei, "nickname": nickname or imei})

if len(exact) == 1:
    target = exact[0]
elif len(exact) > 1:
    raise RuntimeError(f"Friend match ambiguous(exact): {exact}")
elif len(contains) == 1:
    target = contains[0]
elif len(contains) > 1:
    raise RuntimeError(f"Friend match ambiguous(contains): {contains}")
else:
    raise RuntimeError(f"Friend not found: {target_friend}")

resolved_group_name = group_name or f"{target['nickname']}的小群"

create_raw = post(
    "/api/groups/create",
    {
        "imei": owner_imei,
        "name": resolved_group_name,
        "memberImeis": [target["imei"]],
        "assistantEnabled": True,
    },
)
if not create_raw.get("success"):
    raise RuntimeError(f"Create group failed: {create_raw}")

group_id = str(create_raw.get("groupId") or "").strip()
if not group_id:
    raise RuntimeError(f"Missing groupId from create result: {create_raw}")

group = create_raw.get("group") or {}
free_discovery = bool(group.get("free_discovery", False))

# Requirement: new groups should default to free-discovery enabled.
# If backend/old deployment doesn't satisfy this, force-enable once.
if not free_discovery:
    cfg_raw = post(
        "/api/groups/update-config",
        {
            "imei": owner_imei,
            "groupId": group_id,
            "freeDiscovery": True,
        },
    )
    if not cfg_raw.get("success"):
        raise RuntimeError(f"Enable freeDiscovery failed: {cfg_raw}")
    detail = get(f"/api/groups/{group_id}")
    group = (detail or {}).get("group") or group
    free_discovery = bool(group.get("free_discovery", False))

auto_friend_topoclaw_assistants = []
auto_friend_topoclaw_errors = []
if auto_add_friend_topoclaw:
    for member_imei in [owner_imei, target["imei"]]:
        try:
            spec = _resolve_default_topoclaw_assistant(member_imei)
            if not spec:
                auto_friend_topoclaw_errors.append(
                    {"member_imei": member_imei, "error": "default_topoclaw_not_found"}
                )
                continue
            add_raw = post(
                "/api/groups/add-assistant",
                {
                    "imei": owner_imei,
                    "groupId": group_id,
                    "assistantId": spec["assistant_id_internal"] or spec["display_id"],
                    "creatorImei": spec["owner_imei"],
                    "displayId": spec["display_id"],
                    "baseUrl": spec["base_url"],
                    "name": spec["name"],
                    "capabilities": spec["capabilities"],
                    "intro": spec["intro"],
                    "avatar": spec["avatar"],
                    "multiSession": bool(spec["multi_session"]),
                },
            )
            auto_friend_topoclaw_assistants.append(
                {
                    "member_imei": member_imei,
                    "display_id": spec["display_id"],
                    "assistant_id_internal": spec["assistant_id_internal"],
                    "success": bool(add_raw.get("success")),
                    "raw": add_raw,
                }
            )
        except Exception as e:
            auto_friend_topoclaw_errors.append(
                {"member_imei": member_imei, "error": str(e)}
            )

send_raw = post(
    "/api/groups/send-assistant-message",
    {
        "imei": owner_imei,
        "groupId": group_id,
        "content": group_message,
        "sender": group_sender,
    },
)
if not send_raw.get("success"):
    raise RuntimeError(f"Send first group message failed: {send_raw}")

result = {
    "success": True,
    "owner_imei": owner_imei,
    "target_friend": {
        "query": target_friend,
        "nickname": target["nickname"],
        "imei": target["imei"],
    },
    "groupId": group_id,
    "groupName": group.get("name") or resolved_group_name,
    "free_discovery": free_discovery,
    "auto_add_friend_topoclaw": bool(auto_add_friend_topoclaw),
    "auto_friend_topoclaw_assistants": auto_friend_topoclaw_assistants,
    "auto_friend_topoclaw_errors": auto_friend_topoclaw_errors,
    "create_raw": create_raw,
    "send_raw": send_raw,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
```


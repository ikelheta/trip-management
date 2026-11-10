# Health

Liveness check. **Public** (no token needed). Source: `src/modules/health/health.controller.ts`.

| Method | Path | Purpose | Success |
|--------|------|---------|---------|
| GET | `/api/health` | Is the API up? | 200 |

## GET /api/health

No parameters.

**200**

```json
{ "status": "ok" }
```

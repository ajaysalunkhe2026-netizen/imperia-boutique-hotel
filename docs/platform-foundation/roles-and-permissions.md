# Roles and Permissions — Foundation v1

Authorization is enforced on the server and in database access policies where applicable. Hiding a button in the UI is not authorization.

## Roles

- `platform_admin`: maintains platform software and diagnostics; receives only explicitly permitted aggregate business/revenue/commission reporting.
- `hotel_owner`: sees hotel business data and owner-level reports; manages approved hotel settings and staff within the assigned property.
- `hotel_manager`: performs daily reservation, room and check-in/check-out operations within assigned permissions.
- `guest`: can create and view only their own reservations and payment/profile information.

## Permission principles

- Deny by default; grant only the minimum required.
- Every hotel business operation is scoped to a property.
- Platform administration does not automatically grant a right to change hotel business records.
- Platform Admin reporting is read-only and aggregate-only; it does not include guest PII or raw reservation/payment rows.
- Managers do not receive unrestricted financial, user-administration or platform settings access.
- Guests never access internal dashboards or other guests' records.
- Sensitive changes require an audit event with actor, action, target, timestamp and outcome.

## Initial capability matrix

| Capability | Platform Admin | Owner | Manager | Guest |
|---|---|---|---|---|
| Public website content | Platform management | View/approve | View | View |
| Room inventory | Technical support only | Manage | Operate | Search when booking APIs exist |
| Reservations | Aggregate counts only | View/manage | Operational view/manage | Own only |
| Check-in/check-out | No | View | Manage | No |
| Payments/refunds | Aggregate reports only | View/approved actions | Limited status view | Own payment |
| Business/revenue reports | Aggregate read-only | Full property reports | No business revenue | No |
| Commission reports | Read-only | No platform ledger administration | No | No |
| Guest personal information | No | Hotel business need only | Operational need only | Own only |
| User and role management | Platform Admin assignments only | Hotel staff administration | No | No |
| Platform configuration | Manage | No | No | No |

The matrix is an application-policy target, not proof that all workflows are implemented. The hotel owner must approve final business authority boundaries, especially pricing, refunds, cancellation overrides and staff administration.

# Roles and Permissions — Foundation v1

Authorization is enforced on the server and in database access policies where applicable. Hiding a button in the UI is not authorization.

## Roles
- `platform_admin`: maintains the software platform and website configuration.
- `hotel_owner`: sees the hotel's business data and owner-level reports; can approve designated business settings.
- `hotel_manager`: performs daily reservation and room operations within assigned permissions.
- `guest`: can create and view only their own reservations through a verified booking identity.

## Permission principles
- Deny by default; grant only the minimum required.
- Every user is scoped to a property. The first release has one property, but the data model should retain property scoping.
- Platform administration does not automatically grant a right to change hotel business records without an auditable action.
- Managers do not receive unrestricted financial, user-administration or platform settings access.
- Guests never access internal dashboards or other guests' records.
- Sensitive changes require an audit event with actor, action, target, timestamp and outcome.

## Initial capability matrix

| Capability | Platform admin | Owner | Manager | Guest |
|---|---|---|---|---|
| Public website content | Manage | View/approve | No | View |
| Room inventory | Configure | View | Operate | Search availability |
| Reservations | Support access, audited | View all | Manage operations | Own only |
| Check-in/check-out | Support access, audited | View | Manage | No |
| Payments/refunds | Technical support, audited | View/approve policy | Limited status view | Own payment |
| Business reports | Platform diagnostics | Full hotel reports | Operational reports | No |
| User and role management | Platform roles | Hotel staff approval | No | No |
| Platform configuration | Manage | No | No | No |
| Own profile | Manage | Manage | Manage | Manage |

This is a starting policy. The owner must approve the final authority boundaries, especially refunds, pricing, cancellation overrides and staff administration.

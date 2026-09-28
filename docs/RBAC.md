# CLIAS — Role-Based Access Control (RBAC) Specification

## 1. Role Hierarchy & Matrix

| Resource / Action | STUDENT | FACULTY | COUNSELLOR | HOD | HEAD | SUPER_ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View Own Learning Profile | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Self Practice Sessions | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Assigned Tests | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Question Bank Items | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| Create & Assign Tests | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| View Assigned Class Analytics | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Assigned Students' Curve | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Department Analytics | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| View Institutional Analytics | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Import Authorized Students CSV | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage Platform Settings | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 2. Server-Side Enforcement Architecture
- **JWT Claims**: Tokens encode `sub`, `email`, and `role`.
- **NestJS Decorators**: `@Roles(UserRole.SUPER_ADMIN, UserRole.FACULTY)`
- **Guards Pipeline**:
  1. `JwtAuthGuard`: Validates signature, expiry, and user status.
  2. `RolesGuard`: Verifies role permissions strictly on the server.
- **Tenant Isolation**:
  - Students cannot query any student ID other than their own authenticated profile (`req.user.studentId`).
  - Counsellors query only students having an active record in `CounsellorAssignment`.
  - HODs are scoped to their assigned `departmentId`.

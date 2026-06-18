# Frontend API layer

Centralised access to the backend. Screens should import named helpers from
`src/api` instead of hand-building URLs or repeating axios boilerplate.

```js
import { authApi, usersApi, servicesApi, bookingsApi, paymentsApi, smsApi } from '../../api';

const { data } = await usersApi.listByRole('drillers', { customer_type: '' });
await servicesApi.add({ name, type });
await paymentsApi.reconcile(formData);
```

## Files

- `client.js` — the single axios instance. Holds the base URL
  (`REACT_APP_API_URL` env override → production host) and a request
  interceptor that attaches the JWT from `localStorage` to every call.
- `index.js` — one object per resource (`authApi`, `usersApi`, `servicesApi`,
  `bookingsApi`, `paymentsApi`, `smsApi`), each method mapping to a backend route.

`configs/exports.js` re-exports `baseURL` from here, so legacy
`import { baseURL } from '...exports'` usages keep working against one source.

## Migration status

Fully migrated to the API layer: `Account/LogIn`, `Users/Services`,
`Users/Requests`, `Users/RequestDriver`, `Users/Deposits`, and all create/edit/
photo/deactivate mutations in the user-management screens (`Owners`, `Drillers`,
`Drivers`, `Geologists`, `Agents`, `Customer`, `UserProfile`, `UsersStaffs`).

Still using inline `axios.get(baseURL + ...)` (works via the shared base URL):
the **list** queries in the user-management screens, e.g.

```js
axios.get(baseURL + `users?role=drillers&${queryString}`, CONFIG)
```

To finish the migration, replace these with:

```js
usersApi.listByRole('drillers', /* parsed query params */)
```

These were left inline because they build a dynamic `queryString`; converting
them needs per-screen attention rather than a mechanical swap.

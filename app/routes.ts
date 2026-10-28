import { index, type RouteConfig, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('signin', 'routes/signin.tsx'),
  route('signout', 'routes/signout.ts'),
  route('auth/:step', 'routes/auth.ts'),
] satisfies RouteConfig

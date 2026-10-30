import { index, prefix, type RouteConfig, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  ...prefix('blog', [index('routes/blog/index.tsx'), route(':slug', 'routes/blog/post.tsx')]),
  route('signin', 'routes/signin.tsx'),
  ...prefix('stats', [
    index('routes/stats/index.tsx'),
    route('requests', 'routes/stats/requests.tsx'),
  ]),
  route('settings', 'routes/settings.tsx'),
  route('signout', 'routes/signout.ts'),
  route('auth/:step', 'routes/auth.ts'),
  route('e', 'routes/e.ts'),
] satisfies RouteConfig

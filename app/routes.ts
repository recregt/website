import { index, prefix, type RouteConfig, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  ...prefix('projects', [
    index('routes/projects/index.tsx'),
    route(':slug', 'routes/projects/project.tsx'),
  ]),
  ...prefix('tools', [
    index('routes/tools/index.tsx'),
    route('what-you-leak', 'routes/tools/what-you-leak.tsx'),
    route('what-you-leak/tag', 'routes/tools/what-you-leak.tag.ts'),
  ]),
  ...prefix('blog', [index('routes/blog/index.tsx'), route(':slug', 'routes/blog/post.tsx')]),
  route('signin', 'routes/signin.tsx'),
  route('signup', 'routes/signup.tsx'),
  route('recover', 'routes/recover.tsx'),
  ...prefix('stats', [
    index('routes/stats/index.tsx'),
    route('requests', 'routes/stats/requests.tsx'),
  ]),
  route('settings', 'routes/settings.tsx'),
  route('signout', 'routes/signout.ts'),
  route('auth/:step', 'routes/auth.ts'),
  route('e', 'routes/e.ts'),
] satisfies RouteConfig

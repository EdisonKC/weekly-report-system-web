import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true, title: '登录' }
  },
  {
    path: '/',
    component: () => import('../layout/AppLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { title: '工作台', eyebrow: 'OVERVIEW' }
      },
      {
        path: 'my-report',
        name: 'my-report',
        component: () => import('../views/MyReportView.vue'),
        meta: { title: '我的周报', eyebrow: 'MY WEEKLY REPORT' }
      },
      {
        path: 'my-history',
        name: 'my-history',
        component: () => import('../views/MyHistoryView.vue'),
        meta: { title: '历史周报', eyebrow: 'MY REPORT ARCHIVE' }
      },
      {
        path: 'periods',
        name: 'periods',
        component: () => import('../views/PeriodsView.vue'),
        meta: { title: '周报周期', eyebrow: 'REPORT PERIODS', roles: ['ADMIN', 'SUPER_ADMIN'] }
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('../views/ReportsView.vue'),
        meta: { title: '周报审阅', eyebrow: 'REPORT REVIEW', roles: ['ADMIN', 'SUPER_ADMIN'] }
      },
      {
        path: 'workspaces',
        name: 'workspaces',
        component: () => import('../views/WorkspacesView.vue'),
        meta: { title: '工作空间', eyebrow: 'WORKSPACE MANAGEMENT', roles: ['SUPER_ADMIN'] }
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('../views/UsersView.vue'),
        meta: { title: '用户管理', eyebrow: 'TEAM MANAGEMENT', roles: ['SUPER_ADMIN'] }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  document.title = to.meta.title ? `${to.meta.title} · 综合技术服务组周报` : '综合技术服务组周报管理系统'

  if (to.meta.public) {
    if (auth.isLoggedIn && to.name === 'login') {
      return '/dashboard'
    }
    return true
  }

  if (!auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (!auth.user) {
    try {
      await auth.fetchMe()
    } catch (e) {
      auth.logout()
      return { name: 'login' }
    }
  }

  const allowed = to.meta.roles
  if (allowed && !allowed.includes(auth.role)) {
    return '/dashboard'
  }
  return true
})

export default router

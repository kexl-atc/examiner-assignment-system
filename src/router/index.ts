import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'


const lazy = (loader: any) => loader

const routes: any[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/HomePage2.vue')
  },
  {
    path: '/teachers',
    name: 'Teachers',
    component: () => import('../pages/TeachersPage.vue')
  },
  {
    path: '/instructor-assignment',
    name: 'InstructorAssignment',
    component: () => import('../pages/InstructorAssignmentPage.vue')
  },
  {
    path: '/schedules',
    name: 'Schedules',
    component: () => import('../pages/SchedulesPage.vue')
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: lazy(() => import('../pages/StatisticsPage.vue'))
  }
]

// 创建路由实例
// 使用Hash模式以支持file://协议（Electron打包后）
const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router

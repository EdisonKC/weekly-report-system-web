import { defineStore } from 'pinia'
import { authApi } from '../api'

function readStoredWorkspace() {
  try {
    return JSON.parse(localStorage.getItem('wr_workspace') || 'null')
  } catch (e) {
    localStorage.removeItem('wr_workspace')
    return null
  }
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('wr_user') || 'null')
  } catch (e) {
    localStorage.removeItem('wr_user')
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('wr_token') || '',
    user: readStoredUser(),
    workspace: readStoredWorkspace(),
    loading: false
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    role: (state) => state.user?.role || '',
    isEmployee: (state) => state.user?.role === 'EMPLOYEE',
    isAdmin: (state) => state.user?.role === 'ADMIN' || state.user?.role === 'SUPER_ADMIN',
    isSuperAdmin: (state) => state.user?.role === 'SUPER_ADMIN',
    displayName: (state) => state.user?.realName || state.user?.username || '访客',
    workspaceName: (state) => state.workspace?.name || state.user?.workspaceName || '未选择工作空间',
    roleLabel: (state) => {
      return {
        SUPER_ADMIN: '超级管理员',
        ADMIN: '管理员',
        EMPLOYEE: '员工'
      }[state.user?.role] || ''
    }
  },
  actions: {
    async login(form) {
      this.loading = true
      try {
        const data = await authApi.login(form)
        this.token = data.token
        this.user = data.user
        this.workspace = data.workspace
        localStorage.setItem('wr_token', data.token)
        localStorage.setItem('wr_user', JSON.stringify(data.user))
        localStorage.setItem('wr_workspace', JSON.stringify(data.workspace))
        return data
      } finally {
        this.loading = false
      }
    },
    async fetchMe() {
      if (!this.token) return null
      const user = await authApi.me()
      this.user = user
      if (user.workspaceId) {
        this.workspace = { id: user.workspaceId, name: user.workspaceName }
        localStorage.setItem('wr_workspace', JSON.stringify(this.workspace))
      }
      localStorage.setItem('wr_user', JSON.stringify(user))
      return user
    },
    logout() {
      this.token = ''
      this.user = null
      this.workspace = null
      localStorage.removeItem('wr_token')
      localStorage.removeItem('wr_user')
      localStorage.removeItem('wr_workspace')
    }
  }
})

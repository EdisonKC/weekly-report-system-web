import request from './request'

export const authApi = {
  login: (data) => request.post('/auth/login', data),
  me: () => request.get('/auth/me'),
  workspaces: () => request.get('/auth/workspaces')
}

export const dashboardApi = {
  summary: () => request.get('/dashboard')
}

export const periodApi = {
  list: () => request.get('/periods'),
  detail: (id) => request.get(`/periods/${id}`),
  create: (data) => request.post('/periods', data),
  update: (id, data) => request.put(`/periods/${id}`, data)
}

export const reportApi = {
  my: (periodId) => request.get('/reports/my', { params: { periodId } }),
  saveDraft: (periodId, data) => request.put('/reports/my/draft', data, { params: { periodId } }),
  submit: (periodId, data) => request.post('/reports/my/submit', data, { params: { periodId } }),
  list: (periodId, params = {}) => request.get('/reports', { params: { periodId, ...params } }),
  detail: (id) => request.get(`/reports/${id}`),
  evaluate: (id, evaluation) => request.put(`/reports/${id}/evaluation`, { evaluation }),
  reopen: (id) => request.post(`/reports/${id}/reopen`),
  updateNextWeekPlan: (id, nextWeekPlan) => request.put(`/reports/${id}/next-week-plan`, { nextWeekPlan }),
  history: () => request.get('/reports/my/history'),
  importExcel: (periodId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/reports/my/import', formData, { params: { periodId } })
  },
  importTemplate: (periodId) => request.get('/reports/my/import-template', { params: { periodId }, responseType: 'blob' }),
  importHistory: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/reports/import-history', formData)
  },
  export: (periodId) => request.get('/reports/export', { params: { periodId }, responseType: 'blob' })
}

export const workspaceApi = {
  list: () => request.get('/workspaces'),
  create: (data) => request.post('/workspaces', data),
  update: (id, data) => request.put(`/workspaces/${id}`, data),
  remove: (id) => request.delete(`/workspaces/${id}`),
  members: (id) => request.get(`/workspaces/${id}/members`),
  availableUsers: (id) => request.get(`/workspaces/${id}/available-users`),
  addMember: (id, data) => request.post(`/workspaces/${id}/members`, data),
  createMember: (id, data) => request.post(`/workspaces/${id}/members/create`, data),
  updateMemberRole: (id, userId, role) => request.put(`/workspaces/${id}/members/${userId}/role`, { role }),
  removeMember: (id, userId) => request.delete(`/workspaces/${id}/members/${userId}`)
}

export const userApi = {
  list: (params = {}) => request.get('/users', { params }),
  create: (data) => request.post('/users', data),
  updateStatus: (id, status) => request.put(`/users/${id}/status`, { status }),
  resetPassword: (id, password) => request.put(`/users/${id}/password`, { password })
}

import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 30000
})

service.interceptors.request.use((config) => {
  const token = localStorage.getItem('wr_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

service.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') {
      return response
    }
    const payload = response.data
    if (payload && typeof payload === 'object' && 'code' in payload) {
      if (payload.code !== 0) {
        ElMessage.error(payload.message || '请求失败')
        return Promise.reject(new Error(payload.message || '请求失败'))
      }
      return payload.data
    }
    return payload
  },
  async (error) => {
    const response = error.response
    let message = '网络异常，请稍后重试'
    if (response) {
      const data = response.data
      if (data instanceof Blob) {
        try {
          const text = await data.text()
          const parsed = JSON.parse(text)
          message = parsed.message || message
        } catch (e) {
          message = response.status === 401 ? '登录状态已失效' : '请求处理失败'
        }
      } else if (data && data.message) {
        message = data.message
      } else if (response.status === 401) {
        message = '登录状态已失效，请重新登录'
      } else if (response.status === 403) {
        message = '当前账号没有访问权限'
      } else if (response.status === 404) {
        message = '请求的数据不存在'
      } else if (response.status >= 500) {
        message = '服务器开小差了，请稍后重试'
      }
    } else if (error.code === 'ECONNABORTED') {
      message = '请求超时，请稍后重试'
    }

    const isLogin = error.config?.url?.includes('/auth/login')
    ElMessage.error(message)
    if (response?.status === 401 && !isLogin) {
      localStorage.removeItem('wr_token')
      localStorage.removeItem('wr_user')
      if (!window.location.pathname.endsWith('/login')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(new Error(message))
  }
)

export default service

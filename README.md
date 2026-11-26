# weekly-report-system-web

综合技术服务组周报管理系统前端，基于 Vue 3 + Vite + Element Plus 构建，支持多工作空间、员工/管理员角色、周报填报、审阅评价、Excel 导入导出和批量历史数据导入。

## 技术栈

- Vue 3
- Vite 5
- Vue Router 4
- Pinia
- Element Plus
- Axios

## 本地开发

要求 Node.js 18+，使用 pnpm：

```bash
pnpm install
pnpm dev
```

默认开发地址：`http://127.0.0.1:5173/`。

开发环境默认将 `/api` 代理到 `http://127.0.0.1:8080`，后端实际运行端口不同时可通过环境变量覆盖：

```bash
VITE_PROXY_TARGET=http://127.0.0.1:8082 pnpm dev
```

## 生产构建

```bash
pnpm build
pnpm preview
```

构建产物在 `dist/`。`vite preview` 默认使用 `8083` 端口，并将 `/api` 代理到 `http://127.0.0.1:8082`，可通过 `VITE_PROXY_TARGET` 调整。

## 主要功能

- 选择工作空间登录
- 员工、管理员、超级管理员按工作空间区分权限
- 我的周报：上周计划、本周工作项、下周计划、个人 Excel 导入
- 历史周报：个人历史记录与管理员评价
- 周报审阅：评价、退回、修改普通员工下周计划
- 周报周期管理
- 工作空间管理：新增/删除空间、成员管理、空间角色调整
- 历史周报批量导入
- 按模板导出 Excel

## 后端仓库

后端代码：https://github.com/EdisonKC/weekly-report-system

## 许可

内部项目，未经授权请勿外传。

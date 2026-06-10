# MOKE CRM MVP v0.1

## 交付内容

- `moke-crm-mvp.html`：可直接运行的本地 CRM 原型。
- `moke-crm-prisma-schema.prisma`：未来迁移到 Next.js + Prisma + SQLite 时的数据库 schema 草案。
- `moke-crm-imported-data.js`：从 `moke_crm_realistic_import_demo (1).xlsx` 转换出的 CRM 导入数据包。

## 如何打开

当前已启动本地预览：

```text
http://127.0.0.1:8765/moke-crm-mvp.html
```

也可以直接用浏览器打开 `moke-crm-mvp.html`。数据保存在浏览器本地存储中，重置模拟数据会清空本地修改。

当前页面会自动检测 `moke-crm-imported-data.js`。首次打开或刷新时，会把 Excel 导入数据写入本地 CRM 数据。

## Import Wizard 使用方式

1. 打开 `Import / Export` 页面。
2. 选择 `.xlsx` 或 `.csv` 文件。
3. 点击“生成预览”。
4. 检查每一行的 `import_status`、`errors` 和 `warnings`。
5. `ready` 行可直接导入；`need_review` 行需要勾选确认；`error` 行不会导入。
6. 点击“导入可用行”。
7. 如需回退，点击“撤回最近一次导入”。

Debug 面板会显示 `uploaded_file_name`、`parsed_header`、`parsed_row_count`、`first_row_preview`、`mapped_first_row_preview`、文件名识别表类型和表头识别表类型。若文件名和表头明显冲突，会显示 `file_type_conflict` 并阻断导入。

V1.1 精修：

- 增强 `price_acceptance` 映射：高端价可接受、可接受、偏贵、有点贵、Good Value、性价比高等。
- 预览表新增“确认原因”和 mapped result 展开。
- need_review 原因包括 `product_alias_match`、`fuzzy_product_match`、`non_flavor_negative_comment`、`natural_language_rating`。
- 非风味类吐槽会进入 `negative_comment/comment`，不会直接变成 error。
- 缺 customer_name 的 error 行显示 `Missing customer_name / product_name = ...`。

匹配规则：

- 产品：`product_id` > `sku` > 完全产品名 > 产品别名 > 模糊相似度。
- 客户：`customer_id` > 完全客户名 > 模糊相似度。

## 已实现范围

- Dashboard：客户数、活跃客户、商机金额、样品待反馈、报价、订单金额、销售漏斗、产品反馈 Top 5、风味趋势 Top 5。
- Customers：客户 CRUD、筛选、搜索、客户详情页、关联联系人/商机/样品/报价/订单/跟进/反馈/画像。
- Contacts、Products、Flavor Tags、Flavor Profiles、Samples、Opportunities、Quotes、Orders、Interactions、Feedback、Taste Profiles：基础 CRUD、搜索、筛选、CSV 导出。
- Product Flavor Profiles：0-5 分风味强度、主标签/副标签、产品类型自动生成。
- Customer Feedback：总体喜欢程度、购买意愿、喜欢/不喜欢标签、甜度/口感/香气/价格反馈。
- Customer Taste Profile：根据反馈自动汇总客户偏好、不喜欢标签、推荐产品、画像可信度。
- Import / Export：非 AI Excel/CSV Import Wizard；核心表 CSV 导出；保留 `source_system`、`sync_status`、`external_id`。
- Import Wizard：支持 `.xlsx` 和 `.csv`；使用 sheetAliases / fieldAliases 自动识别 sheet 和表头；使用 tagAliases、ratingMap、sweetnessMap 做风味、评分、甜度标准化；导入前生成 ready / need_review / error 预览；need_review 需人工确认后才能导入；导入写入 import_logs；支持撤回最近一次导入。

## 模拟数据

- 10 个客户
- 15 个联系人
- 5 个产品
- 18 个风味标签
- 5 个产品风味画像，对应 35 条风味评分
- 15 个样品记录
- 20 个商机
- 10 个报价
- 5 个订单
- 30 条客户反馈
- 10 个自动生成客户口味画像

## Excel 导入测试数据

已接入的真实导入演示数据包含：

- 36 个客户
- 49 个联系人
- 8 个产品
- 18 个风味标签
- 144 条产品风味评分
- 33 个样品记录
- 60 个商机
- 13 个报价
- 6 个订单
- 60 条跟进记录
- 30 条客户反馈
- 36 个客户口味画像

## 当前原型说明

此版本是浏览器本地原型，用来验证信息架构、业务闭环和页面体验；暂未接入真实数据库、登录权限或服务端 API。

下一步正式工程化时，建议按以下顺序迁移：

1. 建立 Next.js + TypeScript + Tailwind 项目。
2. 放入 `moke-crm-prisma-schema.prisma` 并运行 Prisma migration。
3. 将当前原型中的模拟数据拆成 seed 数据。
4. 将各模块 CRUD 改成 Next.js server actions 或 API routes。
5. 将 CSV 导入导出改成服务端文件处理。
6. 增加登录、权限、备份和 Tier0 同步任务。

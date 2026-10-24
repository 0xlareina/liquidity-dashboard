# 全球市场流动性监控仪表盘

部署：[liquidity-dashboard-six.vercel.app](https://liquidity-dashboard-six.vercel.app)

## 数据源（真实序列，非 mock）

| 指标 | 来源 | 说明 |
|------|------|------|
| RRP | FRED `RRPONTSYD` | 隔夜逆回购，十亿美元 |
| SOFR | FRED `SOFR` | 担保隔夜融资利率 |
| VIX | FRED `VIXCLS` | 恐慌指数 |
| MOVE | Yahoo `^MOVE` | 美债波动率 |
| 投资级/高收益利差 | FRED `BAMLC0A0CM` / `BAMLH0A0HYM2` | ICE BofA OAS（显示为 bp） |
| WALCL / TGA | FRED `WALCL` / `WTREGEN` | 美联储总资产 / 财政部 TGA |
| 净流动性 | WALCL − TGA − RRP | 统一为十亿美元后再换算 |
| 稳定币 | CoinGecko | USDT / USDC / DAI 市值 |
| 美股流动性代理 | Yahoo `SPY` | SPY 日名义成交额（非全市场） |

浏览器端通过 Vercel Functions 代理 FRED CSV 与 Yahoo（避免 CORS，**不再把 FRED API key 写进前端**）：

- `GET /api/fred?id=RRPONTSYD&limit=60`
- `GET /api/yahoo?symbol=^MOVE`

按 `R` 可手动刷新；默认每 5 分钟拉一次。

## 本地说明

直接打开 `index.html` 时 `/api/*` 不可用。请用 Vercel 预览或 `vercel dev`。

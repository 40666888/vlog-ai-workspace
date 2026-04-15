# Live Fixtures

这个目录用于保存 `npm run live:check` 生成的最小真实联调结果。

可能出现的文件：

- `openai.test-connection.success.json`
- `openai.reference_ideas.success.json`
- `openai-compatible.test-connection.success.json`
- `openai-compatible.reference_ideas.success.json`
- `minimax-native.test-connection.success.json`
- `minimax-native.reference_ideas.success.json`
- `minimax_native.success.json`
- `minimax_native.failure.json`
- `minimax_native.raw.json`
- `*.failure.json`
- `live-check.summary.json`

如果当前环境没有真实 key，脚本会只写出 `live-check.summary.json`，并把对应 provider 标记为：

```json
{
  "skipped": true,
  "reason": "missing-live-credentials"
}
```

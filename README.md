# Middle AI JS SDK

This provides an SDK to trace your JavaScript/TypeScript application calls LLMs

## Install

```bash
$ npm i https://github.com/hawku/middle_ai_js
```

## How to use

```js
import MiddleAITracer from 'middle_ai_sdk'

const tracer = new MiddleAITracer('app_reference')

function foo(): void {
    const modelParams = { abc: { def: '1', ghi: '2'}, jkl: '3' }
    const span = tracer.startTrace('trace_name', 'llm_model_name', modelParams, 'prompt', 'user_id', 'thread_id')

    ...

    tracer.endTrace(span, llmOutput)
}
```

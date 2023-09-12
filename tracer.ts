import { Span, Attributes, Tracer } from '@opentelemetry/api'
import { Resource } from '@opentelemetry/resources'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { BasicTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'

enum FeedbackType {
    emoji,
    thumbs,
    scale
}

export class MiddleAITracer {
    private _name: string
    private _provider: BasicTracerProvider
    private _tracer: Tracer
    private _endpoint?: string
    private _apiKey?: string

    public constructor(name: string) {
        this._name = name

        this._endpoint = process.env.MIDDLE_AI_ENDPOINT
        this._apiKey = process.env.MIDDLE_AI_API_KEY

        const exporter = new OTLPTraceExporter({
            url: `${this._endpoint}/v1/traces`,
            headers: { 'x-middle-ai-api-key': this._apiKey },
        })

        this._provider = new BasicTracerProvider({
            resource: new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: name,
            })
        })

        this._provider.addSpanProcessor(new BatchSpanProcessor(exporter))
        this._provider.register()

        this._tracer = this._provider.getTracer("MiddleAI")
    }

    public startTrace(name: string, model: string, modelParams: Object, user: string, prompt: string, threadId: string, initialPrompt: string = ""): Span {
        const parsedModelParams = this.parseModelParams(modelParams)

        const attributes = {
            llm_model: model,
            enduser_id: user,
            user_prompt: prompt,
            application_ref: this._name,
            thread_id: threadId,
            initialPrompt: initialPrompt,
            ...parsedModelParams
        }

        return this._tracer.startSpan(name, { attributes })
    }

    private parseModelParams(modelParams: any, roots: Array<string> = ["model_params"]): Attributes {
        return Object
            // find props of given object
            .keys(modelParams)
            // return an object by iterating props
            .reduce((acc: Object, prop: any) => Object.assign(
                // create a new object
                {},
                // include previously returned object
                acc,
                typeof modelParams[prop] == 'object'
                    // keep working if value is an object
                    ? this.parseModelParams(modelParams[prop], roots.concat([prop]))
                    // include current prop and value and prefix prop with the roots
                    : { [roots.concat([prop]).join('.')]: modelParams[prop] }
            ), {})
    }

    public endTrace(span: Span, output: string): void {
        span.setAttribute("llm_output", output)
        span.end()
    }

    public async sendFeedback(threadId: Span, user: Span, type: FeedbackType, feedback: string): Promise<Boolean> {
        const url = this._endpoint + "/feedback"
        const data = {
            "application_ref": this._name,
            "thread_id": threadId,
            "enduser_id": user,
            "feedback_type": type,
            "feedback_value": feedback
        }

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-middle-ai-api-key": this._apiKey || ""
            },
            body: JSON.stringify(data)
        })

        return response.ok
    }
}

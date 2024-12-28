export interface IISRHandlerWorkerParam {
	startGenerating: number
	hasCache: boolean
	url: string
}

export interface ISSRHandlerWorkerParam {
	hasCache: boolean
	url: string
}

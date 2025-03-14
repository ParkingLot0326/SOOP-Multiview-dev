interface RequestInfo {
    url: string;
    path?: string;
    query?: object;
}

export function proxy_url(params: RequestInfo): string {
    let proxy = `http://proxy.localhost/`
    if (params.path) {
        proxy += `${params.path}`
    }
    proxy += `?url=${encodeURIComponent(params.url)}`
    if (params.query) {
        proxy += `&query=${encodeURIComponent(JSON.stringify(params.query))}`
    }
    return proxy
}
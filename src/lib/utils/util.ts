interface RequestInfo {
    url: string;
    path?: string;
    query?: object;
}

export function proxy_url(params: RequestInfo): string {
    let proxy = `http://proxy.localhost`
    if (params.path) {
        proxy += `/${params.path}`
    } else {
        proxy += `/fetch`
    }

    let url = `${params.url}?`
    if (params.query) {
        Object.entries(params.query).forEach(([key, value]) => {
            url += `${key}=${encodeURIComponent(value)}&`
        })
    }
    // Remove trailing '&' if present
    if (url.endsWith('&')) {
        url = url.slice(0, -1);
    }

    proxy +=
        `?url=${encodeURIComponent(url)}`

    return proxy
}

export function getCookie(name: string): string | undefined {
    let matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}
import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (request.nextUrl.pathname.startsWith("/api/") && !request.nextUrl.pathname.startsWith("/api/health")) {
    // Get endpoints from cookie or use default
    const endpointsCookie = request.cookies.get("mockEndpoints")

    if (endpointsCookie) {
      // Clone the request and add endpoints header
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-mock-endpoints", endpointsCookie.value)

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}

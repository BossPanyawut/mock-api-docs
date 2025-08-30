import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface Endpoint {
  id: string
  path: string
  method: string
  responses: { [statusCode: number]: string }
  group: string
  description?: string
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params, "GET")
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params, "POST")
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params, "PUT")
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleRequest(request, params, "DELETE")
}

async function handleRequest(request: NextRequest, params: { path: string[] }, method: string) {
  const requestPath = "/" + params.path.join("/")

  const url = new URL(request.url)
  const requestedStatus = Number.parseInt(url.searchParams.get("status") || "200")

  try {
    const supabase = await createClient()

    const { data: endpoints, error } = await supabase
      .from("endpoints")
      .select(`
        *,
        groups (
          id,
          name
        )
      `)
      .eq("path", requestPath)
      .eq("method", method)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (endpoints && endpoints.length > 0) {
      const endpoint = endpoints[0]
      const responses = endpoint.responses || {}

      // Try to get the requested status response, fallback to first available
      const response = responses[requestedStatus] || Object.values(responses)[0]

      if (response) {
        const actualStatus = responses[requestedStatus]
          ? requestedStatus
          : Number.parseInt(Object.keys(responses)[0]) || 200

        return NextResponse.json(JSON.parse(response), { status: actualStatus })
      }
    }

    const defaultEndpoints: Endpoint[] = [
      {
        id: "1",
        path: "/api/v1/user",
        method: "GET",
        responses: {
          200: JSON.stringify({ name: "John", age: 30, car: null }),
          404: JSON.stringify({ error: "User not found" }),
          500: JSON.stringify({ error: "Internal server error" }),
        },
        group: "Users",
        description: "Get user information by ID",
      },
    ]

    const defaultEndpoint = defaultEndpoints.find((ep) => ep.path === requestPath && ep.method === method)
    if (defaultEndpoint) {
      const response = defaultEndpoint.responses[requestedStatus] || defaultEndpoint.responses[200]
      if (response) {
        return NextResponse.json(JSON.parse(response), { status: requestedStatus })
      }
    }
  } catch (error) {
    console.error("Error handling request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }

  return NextResponse.json({ error: `Endpoint ${method} ${requestPath} not found` }, { status: 404 })
}

import { NextResponse } from "next/server"

export async function GET() {
  const mockResponse = {
    name: "John",
    age: 30,
    car: null,
  }

  return NextResponse.json(mockResponse)
}

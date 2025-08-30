"use client"

import { useState } from "react"

interface Endpoint {
  path: string
  method: string
  response: object
}

export default function EndpointManager() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([
    {
      path: "/api/v1/user",
      method: "GET",
      response: { name: "John", age: 30, car: null },
    },
  ])

  const [newEndpoint, setNewEndpoint] = useState({
    path: "",
    method: "GET",
    response: "{}",
  })

  const addEndpoint = () => {
    try {
      const parsedResponse = JSON.parse(newEndpoint.response)
      setEndpoints([
        ...endpoints,
        {
          path: newEndpoint.path,
          method: newEndpoint.method,
          response: parsedResponse,
        },
      ])
      setNewEndpoint({ path: "", method: "GET", response: "{}" })
    } catch (error) {
      alert("Invalid JSON response")
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Endpoint Manager</h2>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Add New Endpoint</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Endpoint Path</label>
            <input
              type="text"
              value={newEndpoint.path}
              onChange={(e) => setNewEndpoint({ ...newEndpoint, path: e.target.value })}
              placeholder="/api/v1/example"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
            <select
              value={newEndpoint.method}
              onChange={(e) => setNewEndpoint({ ...newEndpoint, method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Response JSON</label>
          <textarea
            value={newEndpoint.response}
            onChange={(e) => setNewEndpoint({ ...newEndpoint, response: e.target.value })}
            placeholder='{"key": "value"}'
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>
        <button
          onClick={addEndpoint}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
        >
          Add Endpoint
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Current Endpoints</h3>
        <div className="space-y-4">
          {endpoints.map((endpoint, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    endpoint.method === "GET"
                      ? "bg-green-100 text-green-800"
                      : endpoint.method === "POST"
                        ? "bg-blue-100 text-blue-800"
                        : endpoint.method === "PUT"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                  }`}
                >
                  {endpoint.method}
                </span>
                <code className="text-blue-600 font-mono">{endpoint.path}</code>
              </div>
              <pre className="bg-gray-100 p-2 rounded text-sm font-mono overflow-auto">
                {JSON.stringify(endpoint.response, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

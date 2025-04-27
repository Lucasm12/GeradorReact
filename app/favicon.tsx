import { ImageResponse } from "next/server"

export const runtime = "edge"

export const size = {
  width: 32,
  height: 32,
}

export const contentType = "image/svg+xml"

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#4F46E5",
        borderRadius: "4px",
      }}
    >
      <div
        style={{
          width: "24px",
          height: "24px",
          backgroundColor: "white",
        }}
      />
    </div>,
    {
      ...size,
    },
  )
}

import React from "react";

export const MapaMental = ({ conteudo }) => {
  if (!conteudo) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        margin: "32px 0",
        width: "100%",
        overflowX: "auto",
      }}
    >
      {/* Nó central */}
      <div
        style={{
          background: "#6366f1",
          color: "#fff",
          borderRadius: 12,
          fontWeight: "bold",
          fontSize: 22,
          padding: "16px 32px",
          marginBottom: 32,
          boxShadow: "0 2px 8px #0002",
        }}
      >
        {conteudo.topic}
      </div>
      {/* Ramificações */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "40px",
          width: "100%",
          justifyContent: "center",
        }}
      >
        {conteudo.related_topics.map((topic) => (
          <div
            key={topic}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 180,
              maxWidth: 220,
            }}
          >
            <div
              style={{
                background: "#e0e7ff",
                color: "#3730a3",
                borderRadius: 8,
                fontWeight: "bold",
                padding: "8px 16px",
                marginBottom: 10,
                fontSize: 16,
                boxShadow: "0 1px 4px #0001",
                textAlign: "center",
              }}
            >
              {topic}
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {(conteudo.subtopics[topic] || [])
                .slice(0, 7)
                .map((sub, i) => (
                  <li
                    key={i}
                    style={{
                      background: "#fef9c3",
                      color: "#92400e",
                      margin: "4px 0",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 15,
                      textAlign: "center",
                      boxShadow: "0 1px 2px #0001",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 180,
                    }}
                  >
                    {sub.length > 40 ? sub.slice(0, 37) + "..." : sub}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
import React, { useState } from "react";
import axios from "axios";

const DAYS = 30;

function getTodayIndex() {
    const today = new Date();
    return today.getDate() - 1;
}

export default function SeinfeldCalendar() {
    const [checked, setChecked] = useState<boolean[]>(Array(DAYS).fill(false));

    const handleCheck = async (idx: number) => {
        try {
            await axios.post("/api/habitos/checkin", { day: idx + 1 });
            setChecked((prev) => {
                const next = [...prev];
                next[idx] = true;
                return next;
            });
        } catch (e) {
            alert("Erro ao registrar check-in.");
        }
    };

    // Find the longest streak
    let maxStreak = 0, currentStreak = 0, streakEnd = -1;
    checked.forEach((v, i) => {
        if (v) {
            currentStreak++;
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
                streakEnd = i;
            }
        } else {
            currentStreak = 0;
        }
    });

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 32px)", gap: 8 }}>
            {Array.from({ length: DAYS }).map((_, idx) => {
                const isChecked = checked[idx];
                const inStreak = streakEnd !== -1 && idx > streakEnd - maxStreak && idx <= streakEnd;
                return (
                    <button
                        key={idx}
                        onClick={() => handleCheck(idx)}
                        style={{
                            width: 32,
                            height: 32,
                            background: isChecked ? (inStreak ? "#4caf50" : "#2196f3") : "#eee",
                            border: idx === getTodayIndex() ? "2px solid #f44336" : "1px solid #ccc",
                            borderRadius: 4,
                            cursor: isChecked ? "default" : "pointer",
                            color: isChecked ? "#fff" : "#333",
                            fontWeight: idx === getTodayIndex() ? "bold" : "normal",
                        }}
                        disabled={isChecked}
                        title={`Dia ${idx + 1}`}
                    >
                        {idx + 1}
                    </button>
                );
            })}
        </div>
    );
}
import React, { useState } from "react";

export function Input() {
  const [input, setInput] = useState<string>("");

  function handleChange(event: any) {
    setInput(event.target.value);
  }

  return (
      <div>
        <label>Enter value : </label>
        <textarea
            value={input}
            onChange={handleChange}
        />
      </div>
  )
}
import React, { useState } from "react";

interface Props {
  updateFilter: (input: string) => void;
}

export function Input(props: Props) {
  const [input, setInput] = useState<string>("");

  function handleChange(event: any) {
    setInput(event.target.value);
    props.updateFilter(input);
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
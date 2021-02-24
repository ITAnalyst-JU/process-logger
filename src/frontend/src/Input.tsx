import React, { useState } from "react";

interface Props {
  updateFilter: (input: string) => void;
}

export function Input(props: Props) {
  const [input, setInput] = useState<string>("");

  function handleChange(event: any) {
    setInput(event.target.value);
    if (event.target.value.match(/^ *$/) !== null) {
        props.updateFilter("true")
    } else {
        props.updateFilter(event.target.value);
    }
  }

  return (
      <div>
        <label>Enter value to set filters: </label>
        <textarea
            value={input}
            onChange={handleChange}
        />


      </div>
  )
}

import { useState } from "react";

const Todo = () => {
  const [taskList, setTaskList] = useState([]);
  const [name, setName] = useState("");

  const handleSubmit = () => {
    console.log("submitted");
  };

  return (
    <div className="text-neutral-500">
      <h1 className="text-lg font-bold">TODO</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Enter your name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </form>
    </div>
  );
};

export default Todo;

import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function api(path, method = "GET", body, token) {
  const res = await fetch(API + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: "Bearer " + token }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "Something went wrong");
  return data;
}

function Auth({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api(isRegister ? "/auth/register" : "/auth/login", "POST", form);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="card auth">
      <h1>TaskFlow</h1>
      <p className="muted">{isRegister ? "Create your account" : "Welcome back"}</p>
      <form onSubmit={submit}>
        {isRegister && (
          <input placeholder="Name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        )}
        <input type="email" placeholder="Email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder="Password (min 6 chars)" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={loading}>
          {loading ? "Please wait..." : isRegister ? "Sign up" : "Log in"}
        </button>
      </form>
      <p className="muted">
        {isRegister ? "Already have an account?" : "New here?"}{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(!isRegister); setError(""); }}>
          {isRegister ? "Log in" : "Sign up"}
        </a>
      </p>
    </div>
  );
}

function Tasks({ session, onLogout }) {
  const { token, name } = session;
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setTasks(await api("/tasks", "GET", null, token));
    } catch (err) {
      if (err.message.includes("token")) onLogout();
      else setError(err.message);
    }
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const t = await api("/tasks", "POST", { title, priority, dueDate }, token);
      setTasks([t, ...tasks]);
      setTitle(""); setDueDate(""); setPriority("medium");
    } catch (err) { setError(err.message); }
  };

  const update = async (task, changes) => {
    try {
      const t = await api("/tasks/" + task._id, "PUT", changes, token);
      setTasks(tasks.map((x) => (x._id === t._id ? t : x)));
    } catch (err) { setError(err.message); }
  };

  const remove = async (id) => {
    try {
      await api("/tasks/" + id, "DELETE", null, token);
      setTasks(tasks.filter((x) => x._id !== id));
    } catch (err) { setError(err.message); }
  };

  const edit = (task) => {
    const t = window.prompt("Edit task", task.title);
    if (t && t.trim()) update(task, { title: t.trim() });
  };

  const isOverdue = (t) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString());

  const done = tasks.filter((t) => t.completed).length;
  const overdue = tasks.filter(isOverdue).length;

  const shown = tasks
    .filter((t) => filter === "all" || (filter === "done" ? t.completed : !t.completed))
    .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app">
      <header>
        <div>
          <h1>TaskFlow</h1>
          <p className="muted">Hi, {name}</p>
        </div>
        <button onClick={onLogout}>Logout</button>
      </header>

      <div className="stats">
        <div className="card"><b>{tasks.length}</b><span>Total</span></div>
        <div className="card"><b>{tasks.length - done}</b><span>Pending</span></div>
        <div className="card"><b>{done}</b><span>Done</span></div>
        <div className="card"><b className={overdue ? "danger" : ""}>{overdue}</b><span>Overdue</span></div>
      </div>

      <form className="card add" onSubmit={add}>
        <input placeholder="What needs to be done?" value={title}
          onChange={(e) => setTitle(e.target.value)} />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <button className="primary">Add</button>
      </form>

      <div className="toolbar">
        <input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="filters">
          {["all", "pending", "done"].map((f) => (
            <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <ul className="list">
        {shown.length === 0 && <p className="muted center">No tasks to show.</p>}
        {shown.map((t) => (
          <li key={t._id} className={"card task " + (t.completed ? "completed" : "")}>
            <input type="checkbox" checked={t.completed}
              onChange={() => update(t, { completed: !t.completed })} />
            <div className="grow">
              <span className="title">{t.title}</span>
              <div className="meta">
                <span className={"badge " + t.priority}>{t.priority}</span>
                {t.dueDate && (
                  <span className={isOverdue(t) ? "danger" : "muted"}>
                    Due {new Date(t.dueDate).toLocaleDateString()}
                    {isOverdue(t) && " (overdue)"}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => edit(t)}>Edit</button>
            <button className="del" onClick={() => remove(t._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("session")); } catch { return null; }
  });
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const login = (data) => { localStorage.setItem("session", JSON.stringify(data)); setSession(data); };
  const logout = () => { localStorage.removeItem("session"); setSession(null); };

  return (
    <>
      <button className="theme" onClick={() => setDark(!dark)}>{dark ? "Light" : "Dark"} mode</button>
      {session ? <Tasks session={session} onLogout={logout} /> : <Auth onLogin={login} />}
    </>
  );
}

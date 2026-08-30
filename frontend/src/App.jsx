import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    NavLink
} from "react-router-dom";

import {
    Activity,
    BarChart3,
    FileSearch,
    ShieldCheck,
    Upload
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import IndividualCheck from "./pages/IndividualCheck";
import BatchUpload from "./pages/BatchUpload";
import ComponentDetail from "./pages/ComponentDetail";
import Analytics from "./pages/Analytics";
import Starfield from "./components/Starfield";

function App() {
    return (
        <BrowserRouter>
            <div className="app-shell">

                <Starfield />

                <div className="app-ui">

                    <header className="global-header">

                        <div className="global-brand">
                            <div className="global-brand-icon">
                                <ShieldCheck size={19} />
                            </div>

                            <div>
                                <strong>
                                    SIH SCREEN
                                </strong>

                                <span>
                                    AI Component Intelligence
                                </span>
                            </div>
                        </div>

                        <nav className="global-nav">

                            <NavLink
                                to="/dashboard"
                                className={navClass}
                            >
                                <BarChart3 size={15} />
                                Dashboard
                            </NavLink>

                            <NavLink
                                to="/individual-check"
                                className={navClass}
                            >
                                <FileSearch size={15} />
                                Individual
                            </NavLink>

                            <NavLink
                                to="/batch-screening"
                                className={navClass}
                            >
                                <Upload size={15} />
                                Batch
                            </NavLink>

                            <NavLink
                                to="/analytics"
                                className={navClass}
                            >
                                <Activity size={15} />
                                Analytics
                            </NavLink>

                        </nav>

                        <div className="global-status">
                            <span />
                            ONLINE
                        </div>

                    </header>

                    <main className="app-content">

                        <Routes>

                            <Route
                                path="/"
                                element={
                                    <Navigate
                                        to="/dashboard"
                                        replace
                                    />
                                }
                            />

                            <Route
                                path="/dashboard"
                                element={
                                    <Dashboard />
                                }
                            />

                            <Route
                                path="/individual-check"
                                element={
                                    <IndividualCheck />
                                }
                            />

                            <Route
                                path="/batch-screening"
                                element={
                                    <BatchUpload />
                                }
                            />

                            <Route
                                path="/analytics"
                                element={
                                    <Analytics />
                                }
                            />

                            <Route
                                path="/component/:id"
                                element={
                                    <ComponentDetail />
                                }
                            />

                            <Route
                                path="*"
                                element={
                                    <Navigate
                                        to="/dashboard"
                                        replace
                                    />
                                }
                            />

                        </Routes>

                    </main>

                </div>
            </div>
        </BrowserRouter>
    );
}

function navClass({ isActive }) {
    return isActive
        ? "global-nav-link active"
        : "global-nav-link";
}

export default App;

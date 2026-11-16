
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

const slots = [
    "Morning",
    "After breakfast",
    "After lunch",
    "After dinner"
];

const getToday = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000)
        .toISOString()
        .slice(0, 10);
};

function Dashboard() {
    const { user, logout } = useAuth();

    const [readings, setReadings] = useState([]);
    const [report, setReport] = useState(null);
    const [reportType, setReportType] = useState("daily");
    const [selectedDate, setSelectedDate] = useState(getToday());

    const [readingDate, setReadingDate] = useState(getToday());
    const [timeSlot, setTimeSlot] = useState("Morning");
    const [glucoseValue, setGlucoseValue] = useState("");

    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Fetch all readings
    const fetchReadings = async () => {
        try {
            const response = await API.get("/readings");
            setReadings(response.data.readings);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to fetch readings."
            );
        }
    };

    // Fetch selected report
    const fetchReport = async () => {
        try {
            const response = await API.get(
                `/reports/${reportType}?date=${selectedDate}`
            );

            setReport(response.data);
        } catch (err) {
            setReport(null);
            setError(
                err.response?.data?.message ||
                "Unable to fetch report."
            );
        }
    };

    useEffect(() => {
        fetchReadings();
    }, []);

    useEffect(() => {
        fetchReport();
    }, [reportType, selectedDate]);

    // Reset form
    const resetForm = () => {
        setReadingDate(getToday());
        setTimeSlot("Morning");
        setGlucoseValue("");
        setEditingId(null);
    };

    // Add or update reading
    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        const value = Number(glucoseValue);

        if (!readingDate || glucoseValue === "") {
            setError("Please enter a glucose value and date.");
            return;
        }

        if (
            !Number.isInteger(value) ||
            value < 40 ||
            value > 600
        ) {
            setError("Value must be between 40 and 600 mg/dl.");
            return;
        }

        if (readingDate > getToday()) {
            setError("Date cannot be in the future.");
            return;
        }

        const payload = {
            reading_date: readingDate,
            time_slot: timeSlot,
            glucose_value: value
        };

        try {
            setLoading(true);

            if (editingId) {
                await API.put(`/readings/${editingId}`, payload);
                setSuccess("Reading updated successfully!");
            } else {
                await API.post("/readings", payload);
                setSuccess("Reading added successfully!");
            }

            resetForm();

            await Promise.all([
                fetchReadings(),
                fetchReport()
            ]);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to save reading."
            );
        } finally {
            setLoading(false);
        }
    };

    // Edit reading
    const handleEdit = (reading) => {
        setEditingId(reading.id);
        setReadingDate(
            String(reading.reading_date).slice(0, 10)
        );
        setTimeSlot(reading.time_slot);
        setGlucoseValue(String(reading.glucose_value));

        setError("");
        setSuccess("");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    // Delete reading
    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this reading?"
        );

        if (!confirmed) return;

        try {
            setError("");
            setSuccess("");

            await API.delete(`/readings/${id}`);

            setSuccess("Reading deleted successfully!");

            await Promise.all([
                fetchReadings(),
                fetchReport()
            ]);

            if (editingId === id) {
                resetForm();
            }

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to delete reading."
            );
        }
    };

    const formatDate = (date) => {
        if (!date) return "-";

        return new Date(`${String(date).slice(0, 10)}T00:00:00`)
            .toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
            });
    };

    return (
        <div className="dashboard-container">

            {/* Header */}
            <header className="dashboard-header">
                <div>
                    <h1>♥ Sweety</h1>
                    <p>Blood Glucose Tracker</p>
                </div>

                <div className="header-user">
                    <span>Welcome, {user?.name || "Patient"}</span>
                    <button onClick={logout} className="logout-button">
                        Logout
                    </button>
                </div>
            </header>

            <main className="dashboard-main">

                {/* Welcome */}
                <section className="welcome-section">
                    <h2>Your Health Dashboard</h2>
                    <p>
                        Keep track of your glucose levels and
                        stay informed about your health.
                    </p>
                </section>

                {/* Messages */}
                {error && (
                    <div className="error-message">{error}</div>
                )}

                {success && (
                    <div className="success-message">{success}</div>
                )}

                {/* Reading Form */}
                <section className="dashboard-card">
                    <h2>
                        {editingId ? "Edit Reading" : "Add Glucose Reading"}
                    </h2>

                    <form onSubmit={handleSubmit} className="reading-form">

                        <div className="form-group">
                            <label>Date</label>
                            <input
                                type="date"
                                value={readingDate}
                                max={getToday()}
                                onChange={(e) => setReadingDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Time Slot</label>
                            <select
                                value={timeSlot}
                                onChange={(e) => setTimeSlot(e.target.value)}
                            >
                                {slots.map((slot) => (
                                    <option key={slot} value={slot}>
                                        {slot}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Glucose Value (mg/dl)</label>
                            <input
                                type="number"
                                min="40"
                                max="600"
                                step="1"
                                placeholder="Enter glucose value"
                                value={glucoseValue}
                                onChange={(e) => setGlucoseValue(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                type="submit"
                                className="auth-button"
                                disabled={loading}
                            >
                                {loading
                                    ? "Saving..."
                                    : editingId
                                    ? "Update Reading"
                                    : "Add Reading"}
                            </button>

                            {editingId && (
                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={resetForm}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>

                    </form>
                </section>

                {/* Readings Table */}
                <section className="dashboard-card">
                    <h2>My Glucose Readings</h2>

                    {readings.length === 0 ? (
                        <p className="empty-state">
                            No readings recorded yet. Add your first reading!
                        </p>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Time Slot</th>
                                        <th>Glucose (mg/dl)</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {readings.map((reading) => (
                                        <tr key={reading.id}>
                                            <td>
                                                {formatDate(reading.reading_date)}
                                            </td>

                                            <td>{reading.time_slot}</td>

                                            <td>
                                                <strong>
                                                    {reading.glucose_value}
                                                </strong>
                                            </td>

                                            <td className="table-actions">
                                                <button
                                                    className="edit-button"
                                                    onClick={() => handleEdit(reading)}
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="delete-button"
                                                    onClick={() => handleDelete(reading.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Reports */}
                <section className="dashboard-card">
                    <h2>Glucose Reports</h2>

                    <div className="report-controls">
                        <div className="form-group">
                            <label>Select Report</label>

                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                            >
                                <option value="daily">Daily Report</option>
                                <option value="month-to-date">
                                    Month-to-date Report
                                </option>
                                <option value="monthly">
                                    Previous Month Report
                                </option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Selected Date</label>

                            <input
                                type="date"
                                max={getToday()}
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {report && (
                        <>
                            <p className="report-date">
                                {report.report} Report:{" "}
                                {report.date
                                    ? formatDate(report.date)
                                    : `${formatDate(report.start_date)} – ${formatDate(report.end_date)}`}
                            </p>

                            {report.total_readings === 0 ? (
                                <p className="empty-state">
                                    No glucose readings recorded for this period.
                                </p>
                            ) : (
                                <div className="stats-grid">

                                    <div className="stat-card">
                                        <span>Highest</span>
                                        <h3>{report.highest} mg/dl</h3>
                                    </div>

                                    <div className="stat-card">
                                        <span>Lowest</span>
                                        <h3>{report.lowest} mg/dl</h3>
                                    </div>

                                    <div className="stat-card">
                                        <span>Average</span>
                                        <h3>{report.average} mg/dl</h3>
                                    </div>

                                    <div className="stat-card">
                                        <span>Total Readings</span>
                                        <h3>{report.total_readings}</h3>
                                    </div>

                                </div>
                            )}

                            {reportType === "daily" &&
                                report.readings?.length > 0 && (
                                    <div className="daily-readings">
                                        <h3>Daily Reading Details</h3>

                                        {report.readings.map((reading) => (
                                            <div key={reading.id} className="daily-reading-item">
                                                <span>{reading.time_slot}</span>
                                                <strong>
                                                    {reading.glucose_value} mg/dl
                                                </strong>
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </>
                    )}
                </section>

            </main>

            <footer className="dashboard-footer">
                © 2026 Sweety Blood Glucose Tracker
            </footer>

        </div>
    );
}

export default Dashboard;

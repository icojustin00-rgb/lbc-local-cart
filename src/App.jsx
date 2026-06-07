import React, { useEffect, useMemo, useRef, useState } from "react";
import { db, auth } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import html2canvas from "html2canvas";

const LOCATIONS = [
  {
    id: "kh-entrance",
    name: "Kingdom Hall (Entrance)",
    capacity: 3,
    shifts: [
      "06:00 AM - 08:00 AM",
      "02:00 PM - 04:00 PM",
      "04:00 PM - 06:00 PM",
    ],
  },
  {
    id: "kalentong",
    name: "Kalentong",
    capacity: 3,
    shifts: [
      "06:00 AM - 08:00 AM",
      "08:00 AM - 10:00 AM",
      "02:00 PM - 04:00 PM",
      "04:00 PM - 06:00 PM",
    ],
  },
  {
    id: "greenhills-footbridge",
    name: "Greenhills (Footbridge)",
    capacity: 3,
    shifts: [
      "10:00 AM - 12:00 PM",
      "12:00 PM - 02:00 PM",
      "02:00 PM - 04:00 PM",
      "04:00 PM - 06:00 PM",
    ],
  },
];

const DEFAULT_PUBLISHERS = [
  "Agnes Hernandez",
  "Alex Balin",
  "Andrei Lagumen",
  "Arian Plocios",
  "Bianca Laurin",
  "Braize Esmeria",
  "Carrie Umotoy",
  "Catalina Balin",
  "Clarence Umotoy",
  "Crystal Balin",
  "Dexter Laurin",
  "Doris Balbon",
  "Edjie Allado",
  "Eunice Gilboy",
  "Eugene Masangkay",
  "Fely Plata",
  "Genesis Durandar",
  "Grace Joyce Epilepsia",
  "Herry Rivera",
  "Imelda Esmeria",
  "Jedrey Soriano",
  "Jeremy Ico",
  "Jessica Balbon",
  "Jenny Raga",
  "Jehna Allado",
  "Jhosefina Gismundo",
  "Joyce Bustamante",
  "Joyce Meman",
  "Jundy Raga",
  "Julianne Ico",
  "Justin Ico",
  "Katrina Marzo",
  "Kian Ogoy",
  "Kyle Esmeria",
  "Liezel Bustamante",
  "Lorie Lagumen",
  "Marife Gallabo",
  "Mark Alcantara",
  "Marlo Ogoy",
  "Nicole Fedalizo",
  "Pamela Ogoy",
  "Phoebe Cator",
  "Raquel Santos",
  "Rebecca Reyes",
  "Rica Regalado",
  "Richie Reyes",
  "Roma Allado",
  "Rosalie Cuizon",
  "Sarah Mae Masangkay",
  "Tess Alcantara",
  "Virgie Hernandez",
  "Virginia Largadas",
  "Yaninah Raga",
].sort((a, b) => a.localeCompare(b));

function mergePublisherNames(names = []) {
  return Array.from(new Set([...DEFAULT_PUBLISHERS, ...names].filter(Boolean))).sort(
    (a, b) => a.localeCompare(b)
  );
}


const STORAGE_KEY = "lbc-local-cart-cache";
const WAITING_LIST_LIMIT = 2;

const ELDER_NAME = "Bro. Edjie Allado";
const ELDER_MESSENGER = "https://www.facebook.com/edjie.allado";

const JUSTIN_MESSENGER = "https://www.facebook.com/justin.ico.737";
const GC_LINK = "https://m.me/YOURGROUPCHAT";

const REMINDERS = [
  {
    title: "Punctuality",
    text: "It would be appreciated if we could arrive about 5–10 minutes before our shift to allow a smooth handover with the previous group.",
  },
  {
    title: "Inventory Check",
    text: "Kindly check if the literature racks are filled. If you notice that a specific brochure is running low, you may note it in the Shift Notes.",
  },
  {
    title: "Cleanliness",
    text: "If the cart appears dusty or has fingerprints, a quick wipe using tissue or wipes would be appreciated.",
  },
  {
    title: "Approachability",
    text: "Standing near the cart with a warm and welcoming expression can help make others feel comfortable to approach.",
  },
  {
    title: "End of Shift",
    text: "At the end of the shift, if there are no groups assigned after, kindly return the cart to its designated storage area. The last group of the day may also help ensure it is properly returned.",
  },
  {
    title: "Emergency Situations",
    text: "In the event of any disturbance or unexpected situation, please prioritize your safety. It is alright to step away from the cart if needed. Kindly inform or contact the keyman as soon as possible for assistance.",
  },
];

const LANDING_HERO_SLIDES = [
  {
    mobileSrc: "/hero/local-cart-640.webp",
    desktopSrc: "/hero/local-cart-1200.webp",
    fallbackSrc: "/hero/local-cart.png",
    alt: "Local Cart illustration",
  },
  {
    mobileSrc: "/hero/kingdom-hall-640.webp",
    desktopSrc: "/hero/kingdom-hall-1200.webp",
    fallbackSrc: "/hero/kingdom-hall.png",
    alt: "Kingdom Hall illustration",
  },
  {
    mobileSrc: "/hero/local-cart-kingdom-hall-640.webp",
    desktopSrc: "/hero/local-cart-kingdom-hall-1200.webp",
    fallbackSrc: "/hero/local-cart-kingdom-hall.png",
    alt: "Local Cart and Kingdom Hall illustration",
  },
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthLabel(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function longDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function compactShiftLabel(shift) {
  return shift
    .replace("06:00 AM", "6:00 AM")
    .replace("08:00 AM", "8:00 AM")
    .replace("10:00 AM", "10:00 AM")
    .replace("12:00 PM", "12:00 PM")
    .replace("02:00 PM", "2:00 PM")
    .replace("04:00 PM", "4:00 PM")
    .replace("06:00 PM", "6:00 PM");
}

function getCalendarGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const cells = [];

  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function normalizeBookingEntry(entry) {
  if (typeof entry === "string") {
    return {
      name: entry,
      pin: "",
      bookedAt: null,
      status: "booked",
    };
  }

  return {
    name: entry?.name || "",
    pin: entry?.pin || "",
    bookedAt: entry?.bookedAt || null,
    status: entry?.status || "booked",
  };
}

function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getShiftBookings(bookingMap, locationName, dateStr, shift) {
  const raw = bookingMap?.[locationName]?.[dateStr]?.[shift];
  if (!Array.isArray(raw)) return [];

  return raw.map(normalizeBookingEntry).filter((entry) => entry.name);
}

function promoteWaitingBookings(entries, capacity) {
  let openSlots =
    capacity - entries.filter((entry) => entry.status === "booked").length;

  if (openSlots <= 0) return entries;

  return entries.map((entry) => {
    if (openSlots <= 0 || entry.status !== "waiting") return entry;
    openSlots -= 1;
    return { ...entry, status: "booked" };
  });
}

function getAvailabilityStatus(booked, capacity) {
  if (booked <= 0) return "empty";
  if (booked >= capacity) return "full";
  if (booked >= capacity - 1) return "almost";
  return "partial";
}

function getDaySummary(locationName, dateStr, bookingMap, capacity) {
  const location = LOCATIONS.find((loc) => loc.name === locationName);
  const shifts = location?.shifts || [];

  const counts = shifts.map((shift) =>
    getShiftBookings(bookingMap, locationName, dateStr, shift).filter((e) => e.status === "booked").length
  );
  const totalBookings = counts.reduce((sum, count) => sum + count, 0);
  const openShiftCount = counts.filter((count) => count < capacity).length;

  let color = "empty";
  if (totalBookings > 0 && openShiftCount === 0) color = "full";
  else if (totalBookings > 0 && openShiftCount === 1) color = "almost";
  else if (totalBookings > 0) color = "partial";

  return { color };
}

function getShiftCardStyle(booked, capacity) {
  if (booked <= 0) {
    return {
      bar: "status-empty",
      badge: "No one booked yet",
      badgeClass: "text-muted",
    };
  }

  if (booked >= capacity) {
    return {
      bar: "status-full",
      badge: "Full",
      badgeClass: "text-red",
    };
  }

  if (booked >= capacity - 1) {
    return {
      bar: "status-almost",
      badge: "Almost Full",
      badgeClass: "text-yellow",
    };
  }

  return {
    bar: "status-open",
    badge: "Slots still available",
    badgeClass: "text-green",
  };
}

function getMonthlyEntries(bookingMap, locationName, dateStr) {
  const rawDayData = bookingMap?.[locationName]?.[dateStr];
  const dayData = isRecord(rawDayData) ? rawDayData : {};
  const location = LOCATIONS.find((loc) => loc.name === locationName);
  const shifts = location?.shifts || [];

  return shifts
    .filter((shift) => Array.isArray(dayData[shift]) && dayData[shift].length > 0)
    .map((shift) => ({
      shift,
      entries: dayData[shift].map((entry, index) => ({
        ...normalizeBookingEntry(entry),
        index,
      })),
    }));
}

function buildMonthlyGcText(bookingMap, locationName, monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lines = [
    `${monthLabel(monthDate).toUpperCase()} – ${locationName.toUpperCase()}`,
    "",
  ];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
    const entries = getMonthlyEntries(bookingMap, locationName, iso);
    if (entries.length === 0) continue;

    lines.push(longDateLabel(iso).toUpperCase());

    entries.forEach((entry) => {
      lines.push(compactShiftLabel(entry.shift));
      lines.push(entry.entries.map((item) => item.name).join(", "));
      lines.push("");
    });
  }

  return lines.join("\n").trim();
}

function parseShiftEnd(dateStr, shift) {
  const endPart = shift.split(" - ")[1];
  if (!endPart) return null;

  const [time, meridiem] = endPart.split(" ");
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  const endDate = new Date(`${dateStr}T00:00:00`);
  endDate.setHours(hour, minute, 0, 0);
  return endDate;
}

function parseShiftStart(dateStr, shift) {
  const startPart = shift.split(" - ")[0];
  if (!startPart) return null;

  const [time, meridiem] = startPart.split(" ");
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  const startDate = new Date(`${dateStr}T00:00:00`);
  startDate.setHours(hour, minute, 0, 0);
  return startDate;
}

function isShiftEnded(dateStr, shift) {
  const endDate = parseShiftEnd(dateStr, shift);
  if (!endDate) return false;
  return new Date() > endDate;
}

function getNextShift(selectedLocation, selectedShift) {
  const shifts = selectedLocation?.shifts || [];
  const currentIndex = shifts.indexOf(selectedShift);
  if (currentIndex < 0) return null;
  return shifts[currentIndex + 1] || null;
}

function isSameCalendarDate(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function isWithinShiftNotesWindow(selectedLocation, dateStr, shift) {
  if (!shift) return false;

  const ended = isShiftEnded(dateStr, shift);
  if (!ended) return false;

  const now = new Date();
  const selectedDay = new Date(dateStr + "T00:00:00");
  const nextShift = getNextShift(selectedLocation, shift);

  if (!nextShift) {
    return isSameCalendarDate(now, selectedDay);
  }

  const nextShiftStart = parseShiftStart(dateStr, nextShift);
  if (!nextShiftStart) {
    return isSameCalendarDate(now, selectedDay);
  }

  return now < nextShiftStart;
}

export default function App() {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const initialActiveTab = params.get("tab") || "booking";
  const initialPage = params.get("page") || "landing";
  const initialSelectedLocation =
    LOCATIONS.find((loc) => loc.id === params.get("location")) || LOCATIONS[0];
  const initialSelectedDate = params.get("date") || toISODate(new Date());
  const initialSelectedShift = params.get("shift") || "";
  const initialAdminRoute = params.get("admin") === "1";

  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [page, setPage] = useState(initialPage);
  const [selectedLocation, setSelectedLocation] = useState(initialSelectedLocation);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [selectedShift, setSelectedShift] = useState(initialSelectedShift);
  const [selectedName, setSelectedName] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [monthDate, setMonthDate] = useState(new Date());
  const [bookingMap, setBookingMap] = useState({});
  const [maintenanceMap, setMaintenanceMap] = useState({});
  const [publishers, setPublishers] = useState(DEFAULT_PUBLISHERS);
  const [message, setMessage] = useState("");
  const [searchTouched, setSearchTouched] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [firestoreConnected, setFirestoreConnected] = useState(false);
  const [recentBooking, setRecentBooking] = useState(null);
  const [isAdminRoute, setIsAdminRoute] = useState(initialAdminRoute);
  const [issueText, setIssueText] = useState("");
  const [remindersOpen, setRemindersOpen] = useState(false);

  function goToAdminPage() {
    const params = new URLSearchParams(window.location.search);
    params.set("admin", "1");
    params.set("tab", activeTab);
    params.set("page", page);
    params.set("location", selectedLocation?.id || LOCATIONS[0].id);
    params.set("date", selectedDate);
    if (selectedShift) {
      params.set("shift", selectedShift);
    } else {
      params.delete("shift");
    }
    window.location.search = params.toString();
  }

  function exitAdminMode() {
    setIsAdminRoute(false);
    const params = new URLSearchParams(window.location.search);
    params.delete("admin");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    params.set("tab", activeTab);
    params.set("page", page);
    params.set("location", selectedLocation?.id || LOCATIONS[0].id);
    params.set("date", selectedDate);

    if (isAdminRoute) {
      params.set("admin", "1");
    } else {
      params.delete("admin");
    }

    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [activeTab, page, selectedLocation, selectedDate, selectedShift, isAdminRoute]);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [pendingCancelEntry, setPendingCancelEntry] = useState(null);
  const [pendingCancelIndex, setPendingCancelIndex] = useState(null);
  const [cancelPinInput, setCancelPinInput] = useState("");
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminSession, setAdminSession] = useState(false);
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [newPublisherName, setNewPublisherName] = useState("");

  const [selectedMonthlyBookings, setSelectedMonthlyBookings] = useState([]);
  const [monthlyCancelConfirmOpen, setMonthlyCancelConfirmOpen] = useState(false);

  const pinCardRef = useRef(null);

  const currentShifts = useMemo(() => {
    return selectedLocation?.shifts || [];
  }, [selectedLocation]);

  const currentMaintenance = useMemo(() => {
    return maintenanceMap?.[selectedLocation.name] || null;
  }, [maintenanceMap, selectedLocation.name]);

  const showIssueForm = useMemo(() => {
    return (
      !!selectedShift &&
      isWithinShiftNotesWindow(selectedLocation, selectedDate, selectedShift)
    );
  }, [selectedLocation, selectedDate, selectedShift]);

  async function initFirestoreBookings() {
    const bookingsRef = doc(db, "cart", "bookings");

    try {
      await setDoc(bookingsRef, {}, { merge: true });
      setFirestoreConnected(true);
      setMessage("Firestore booking document initialized.");
    } catch (error) {
      console.error("Error initializing Firestore bookings:", error);
      setFirestoreConnected(false);
      setMessage(
        "Could not initialize Firestore bookings. Please check rules or project config."
      );
    }
  }

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (isRecord(parsed)) {
          setBookingMap(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    const bookingsRef = doc(db, "cart", "bookings");
    const maintenanceRef = doc(db, "cart", "maintenanceNotes");
    const publishersRef = doc(db, "cart", "publishers");

    const unsubscribeBookings = onSnapshot(
      bookingsRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          setFirestoreConnected(true);
          const nextData = isRecord(data) ? data : {};
          setBookingMap(nextData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
        } else {
          try {
            await setDoc(bookingsRef, {}, { merge: true });
            setFirestoreConnected(true);
            setBookingMap({});
            localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
          } catch (error) {
            console.error("Error creating bookings document:", error);
            setFirestoreConnected(false);
            setMessage(
              "Cannot initialize Firestore bookings. Check console / Firestore access."
            );
          }
        }
      },
      (error) => {
        console.error("Error listening to bookings:", error);
        setFirestoreConnected(false);
        setMessage(
          "Firestore bookings sync failed. Please check your Firestore rules and project settings."
        );
      }
    );

    const unsubscribeMaintenance = onSnapshot(
      maintenanceRef,
      async (snap) => {
        if (snap.exists()) {
          setMaintenanceMap(snap.data() || {});
        } else {
          await setDoc(maintenanceRef, {});
          setMaintenanceMap({});
        }
      },
      (error) => {
        console.error("Error listening to maintenance notes:", error);
      }
    );

    const unsubscribePublishers = onSnapshot(
      publishersRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          const names = Array.isArray(data.names)
            ? mergePublisherNames(data.names)
            : DEFAULT_PUBLISHERS;
          setPublishers(names);
          if (!Array.isArray(data.names) || names.length !== data.names.filter(Boolean).length) {
            await setDoc(publishersRef, { names }, { merge: true });
          }
        } else {
          try {
            await setDoc(publishersRef, { names: DEFAULT_PUBLISHERS }, { merge: true });
            setPublishers(DEFAULT_PUBLISHERS);
          } catch (error) {
            console.error("Error creating publishers document:", error);
          }
        }
      },
      (error) => {
        console.error("Error listening to publishers:", error);
      }
    );

    return () => {
      unsubscribeBookings();
      unsubscribeMaintenance();
      unsubscribePublishers();
    };
  }, []);

  useEffect(() => {
    if (!isAdminRoute) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAdminSession(true);
        setAdminDisplayName(user.email || "Admin");
      } else {
        setAdminSession(false);
        setAdminDisplayName("");
      }
    });

    return () => unsubscribe();
  }, [isAdminRoute]);

  useEffect(() => {
    setSelectedMonthlyBookings([]);
    setMonthlyCancelConfirmOpen(false);
  }, [selectedLocation, monthDate]);

  useEffect(() => {
    if (activeTab === "booking" && page === "names" && !selectedShift) {
      setPage("details");
    }
  }, [activeTab, page, selectedShift]);

  const calendarCells = useMemo(() => getCalendarGrid(monthDate), [monthDate]);

  const filteredNames = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    if (!q) return [];

    return publishers.filter((name) => {
      const normal = name.toLowerCase();
      const parts = name.trim().split(" ");
      const lastNameFirst =
        parts.length >= 2
          ? `${parts[parts.length - 1]} ${parts.slice(0, -1).join(" ")}`.toLowerCase()
          : normal;

      return normal.includes(q) || lastNameFirst.includes(q);
    });
  }, [nameQuery]);

  const selectedShiftBookings = useMemo(() => {
    if (!selectedShift) return [];

    return getShiftBookings(
      bookingMap,
      selectedLocation.name,
      selectedDate,
      selectedShift
    );
  }, [bookingMap, selectedLocation.name, selectedDate, selectedShift]);

  async function handleAdminLogin(e) {
    e.preventDefault();
    setAdminError("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        adminEmail.trim(),
        adminPassword.trim()
      );
      setAdminDisplayName(userCredential.user.email || "Admin");
    } catch (error) {
      console.error("Admin login failed:", error);
      setAdminError("Invalid email or password.");
    }
  }

  async function handleAdminLogout() {
    try {
      await signOut(auth);
      setAdminEmail("");
      setAdminPassword("");
      setAdminError("");
      setAdminDisplayName("");
    } catch (error) {
      console.error("Admin logout failed:", error);
    }
  }

  async function addPublisher() {
    const name = newPublisherName.trim();
    if (!name) {
      setMessage("Please enter a publisher name.");
      return;
    }

    const next = Array.from(new Set([...(publishers || []), name])).sort((a, b) => a.localeCompare(b));

    try {
      const ref = doc(db, "cart", "publishers");
      await setDoc(ref, { names: next });
      setNewPublisherName("");
      setMessage("Publisher list updated.");
    } catch (error) {
      console.error("Error updating publishers:", error);
      setMessage("Failed to update publishers.");
    }
  }

  async function removePublisher(name) {
    const next = (publishers || []).filter((n) => n !== name);

    try {
      const ref = doc(db, "cart", "publishers");
      await setDoc(ref, { names: next });
      setMessage("Publisher removed.");
    } catch (error) {
      console.error("Error removing publisher:", error);
      setMessage("Failed to remove publisher.");
    }
  }

  function moveMonth(direction) {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  }

  function enterLocation(location) {
    setSelectedLocation(location);
    setMessage("");
    setPage("calendar");
    setActiveTab("booking");
    setRecentBooking(null);
  }

  function openDate(dateObj) {
    setSelectedDate(toISODate(dateObj));
    setSelectedShift("");
    setSelectedName("");
    setNameQuery("");
    setSearchTouched(false);
    setMessage("");
    setRecentBooking(null);
    setIssueText("");

    if (activeTab === "booking") setPage("details");
  }

  function chooseShift(shift) {
    setSelectedShift(shift);
    setSelectedName("");
    setNameQuery("");
    setSearchTouched(false);
    setMessage("");
    setRecentBooking(null);
    setIssueText("");
    setPage("names");
  }

  function openCancelModal(entry, index) {
    setPendingCancelEntry(entry);
    setPendingCancelIndex(index);
    setCancelPinInput("");
    setSupportModalOpen(false);
    setCancelModalOpen(true);
    setMessage("");
  }

  function closeCancelModal() {
    setCancelModalOpen(false);
    setPendingCancelEntry(null);
    setPendingCancelIndex(null);
    setCancelPinInput("");
    setSupportModalOpen(false);
  }

  function handleKeypadPress(value) {
    if (value === "clear") {
      setCancelPinInput("");
      return;
    }

    if (value === "back") {
      setCancelPinInput((prev) => prev.slice(0, -1));
      return;
    }

    if (cancelPinInput.length >= 4) return;
    setCancelPinInput((prev) => prev + value);
  }

  function buildMonthlySelectionKey(locationName, dateStr, shift, index) {
    return `${locationName}|||${dateStr}|||${shift}|||${index}`;
  }

  function toggleMonthlyBookingSelection(locationName, dateStr, shift, entryIndex) {
    const key = buildMonthlySelectionKey(locationName, dateStr, shift, entryIndex);

    setSelectedMonthlyBookings((prev) => {
      if (prev.includes(key)) {
        return prev.filter((item) => item !== key);
      }
      return [...prev, key];
    });
  }

  function isMonthlyBookingSelected(locationName, dateStr, shift, entryIndex) {
    const key = buildMonthlySelectionKey(locationName, dateStr, shift, entryIndex);
    return selectedMonthlyBookings.includes(key);
  }

  async function cancelSelectedMonthlyBookings() {
    if (!(isAdminRoute && adminSession)) return;
    if (selectedMonthlyBookings.length === 0) return;

    const nextBookingMap = isRecord(bookingMap)
      ? JSON.parse(JSON.stringify(bookingMap))
      : {};

    [...selectedMonthlyBookings]
      .sort((a, b) => {
        const [aLocation, aDate, aShift, aIndex] = a.split("|||");
        const [bLocation, bDate, bShift, bIndex] = b.split("|||");
        const aGroup = `${aLocation}|||${aDate}|||${aShift}`;
        const bGroup = `${bLocation}|||${bDate}|||${bShift}`;

        if (aGroup !== bGroup) return aGroup.localeCompare(bGroup);
        return Number(bIndex) - Number(aIndex);
      })
      .forEach((key) => {
      const [locationName, dateStr, shift, indexStr] = key.split("|||");
      const entryIndex = Number(indexStr);

      const shiftEntries = nextBookingMap?.[locationName]?.[dateStr]?.[shift];
      if (!Array.isArray(shiftEntries)) return;

      shiftEntries.splice(entryIndex, 1);
      nextBookingMap[locationName][dateStr][shift] = promoteWaitingBookings(
        shiftEntries,
        LOCATIONS.find((loc) => loc.name === locationName)?.capacity || 0
      );
    });

    Object.keys(nextBookingMap).forEach((locationName) => {
      const locationData = isRecord(nextBookingMap[locationName])
        ? nextBookingMap[locationName]
        : {};
      Object.keys(locationData).forEach((dateStr) => {
        const dateData = isRecord(locationData[dateStr])
          ? locationData[dateStr]
          : {};
        Object.keys(dateData).forEach((shift) => {
          if (Array.isArray(dateData[shift]) && dateData[shift].length === 0) {
            delete dateData[shift];
          }
        });
        if (Object.keys(dateData).length === 0) {
          delete locationData[dateStr];
        }
      });
      if (Object.keys(locationData).length === 0) {
        delete nextBookingMap[locationName];
      }
    });

    setBookingMap(nextBookingMap);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBookingMap));
    setSelectedMonthlyBookings([]);
    setMonthlyCancelConfirmOpen(false);
    setMessage("Selected booking(s) cancelled.");

    try {
      const ref = doc(db, "cart", "bookings");
      await setDoc(ref, nextBookingMap);
    } catch (error) {
      console.error("Error cancelling selected monthly bookings:", error);
      setMessage("Cancelled locally first, but cloud sync failed.");
    }
  }

  async function updateMaintenanceForLocation(locationName, payload) {
    const nextMap = {
      ...maintenanceMap,
      [locationName]: payload,
    };

    if (!payload || payload.status === "done" || !payload.text?.trim()) {
      delete nextMap[locationName];
    }

    setMaintenanceMap(nextMap);

    try {
      const ref = doc(db, "cart", "maintenanceNotes");
      await setDoc(ref, nextMap);
    } catch (error) {
      console.error("Error updating maintenance notes:", error);
      setMessage("Maintenance update failed to sync.");
    }
  }

  async function submitShiftNotes() {
    const text = issueText.trim();
    if (!text) {
      setMessage("Please write the notes first.");
      return;
    }

    await updateMaintenanceForLocation(selectedLocation.name, {
      text,
      status: "active",
      noteDate: selectedDate,
      noteShift: selectedShift,
      updatedAt: new Date().toISOString(),
    });

    setIssueText("");
    setMessage("Shift notes submitted.");
  }

  async function markMaintenancePending() {
    if (!(isAdminRoute && adminSession) || !currentMaintenance?.text) return;

    await updateMaintenanceForLocation(selectedLocation.name, {
      ...currentMaintenance,
      status: "pending",
      updatedAt: new Date().toISOString(),
    });

    setMessage("Issue marked as pending.");
  }

  async function markMaintenanceDone() {
    if (!(isAdminRoute && adminSession)) return;

    await updateMaintenanceForLocation(selectedLocation.name, {
      status: "done",
      text: "",
      updatedAt: new Date().toISOString(),
    });

    setMessage("Issue marked as done.");
  }

  async function savePinScreenshot() {
    if (!pinCardRef.current || !recentBooking) return;

    try {
      const canvas = await html2canvas(pinCardRef.current, {
        backgroundColor: "#fff7e8",
        scale: 2,
      });

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );

      if (!blob) throw new Error("Image creation failed");

      const fileName = `lbc-pin-${recentBooking.name
        .replace(/\s+/g, "-")
        .toLowerCase()}.png`;

      const file = new File([blob], fileName, { type: "image/png" });

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: "LBC Local Cart PIN",
          text: "Save this cancellation PIN screenshot.",
        });
        setMessage("Screenshot ready to save/share.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage("Screenshot downloaded.");
    } catch (error) {
      console.error("Save screenshot failed:", error);
      setMessage("Save screenshot failed. Please take a manual screenshot.");
    }
  }

  async function confirmBooking() {
    if (!selectedName) {
      setMessage("Please select a name first.");
      return;
    }

    if (!selectedShift) {
      setMessage("Please select a shift first.");
      return;
    }

    const pickedName = selectedName;

    const currentShiftBookings = getShiftBookings(
      bookingMap,
      selectedLocation.name,
      selectedDate,
      selectedShift
    );
    if (currentShiftBookings.some((entry) => entry.name === pickedName)) {
      setMessage("You are already booked or on the waiting list for this shift.");
      return;
    }

    const bookedCount = currentShiftBookings.filter((e) => e.status === "booked").length;
    const waitingCount = currentShiftBookings.filter((e) => e.status === "waiting").length;
    const isFull = bookedCount >= selectedLocation.capacity;

    if (isFull && waitingCount >= WAITING_LIST_LIMIT) {
      setMessage("This shift and waiting list are already full.");
      return;
    }

    const newEntry = {
      name: pickedName,
      pin: generatePin(),
      bookedAt: new Date().toISOString(),
      status: isFull ? "waiting" : "booked",
    };

    const nextBookingMap = {
      ...bookingMap,
      [selectedLocation.name]: {
        ...(bookingMap[selectedLocation.name] || {}),
        [selectedDate]: {
          ...((bookingMap[selectedLocation.name] || {})[selectedDate] || {}),
          [selectedShift]: [...currentShiftBookings, newEntry],
        },
      },
    };

    setBookingMap(nextBookingMap);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBookingMap));
    setSelectedName("");
    setNameQuery("");
    setSearchTouched(false);
    setRecentBooking(newEntry);
    setMessage(
      isFull ? `${pickedName} joined the waiting list.` : `${pickedName} booked successfully.`
    );

    try {
      const ref = doc(db, "cart", "bookings");
      await setDoc(ref, nextBookingMap);
    } catch (error) {
      console.error("Error booking shift:", error);
      setMessage(
        "Booking saved locally first, but cloud sync failed. Please refresh and try again."
      );
    }
  }

  async function cancelBookingWithPin() {
    if (!pendingCancelEntry) return;

    if (!pendingCancelEntry.pin) {
      setMessage(
        "This booking has no PIN. Please use Forgot PIN so an admin can cancel it."
      );
      return;
    }

    if (cancelPinInput.length !== 4) {
      setMessage("Please enter your 4-digit PIN.");
      return;
    }

    if (cancelPinInput !== pendingCancelEntry.pin) {
      setMessage("Incorrect PIN. Please try again.");
      return;
    }

    const currentShiftBookings = getShiftBookings(
      bookingMap,
      selectedLocation.name,
      selectedDate,
      selectedShift
    );

    const nextBookings = currentShiftBookings.filter(
      (_, index) => index !== pendingCancelIndex
    );

    const nextBookingList = promoteWaitingBookings(
      nextBookings,
      selectedLocation.capacity
    );

    const nextBookingMap = {
      ...bookingMap,
      [selectedLocation.name]: {
        ...(bookingMap[selectedLocation.name] || {}),
        [selectedDate]: {
          ...((bookingMap[selectedLocation.name] || {})[selectedDate] || {}),
          [selectedShift]: nextBookingList,
        },
      },
    };

    setBookingMap(nextBookingMap);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBookingMap));
    closeCancelModal();
    setRecentBooking(null);
    setMessage(`${pendingCancelEntry.name} was removed from ${selectedShift}.`);

    try {
      const ref = doc(db, "cart", "bookings");
      await setDoc(ref, nextBookingMap);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      setMessage("Cancelled locally first, but cloud sync failed. Please refresh and try again.");
    }
  }

  async function adminCancelBooking() {
    if (!(isAdminRoute && adminSession) || pendingCancelIndex === null) return;

    const currentShiftBookings = getShiftBookings(
      bookingMap,
      selectedLocation.name,
      selectedDate,
      selectedShift
    );

    const nextBookings = currentShiftBookings.filter(
      (_, index) => index !== pendingCancelIndex
    );

    const nextBookingList = promoteWaitingBookings(
      nextBookings,
      selectedLocation.capacity
    );

    const nextBookingMap = {
      ...bookingMap,
      [selectedLocation.name]: {
        ...(bookingMap[selectedLocation.name] || {}),
        [selectedDate]: {
          ...((bookingMap[selectedLocation.name] || {})[selectedDate] || {}),
          [selectedShift]: nextBookingList,
        },
      },
    };

    setBookingMap(nextBookingMap);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBookingMap));
    closeCancelModal();
    setRecentBooking(null);
    setMessage("Booking removed by admin.");

    try {
      const ref = doc(db, "cart", "bookings");
      await setDoc(ref, nextBookingMap);
    } catch (error) {
      console.error("Error admin cancelling booking:", error);
      setMessage("Admin cancel saved locally first, but cloud sync failed.");
    }
  }

  async function copyMonthlySchedule() {
    const text = buildMonthlyGcText(bookingMap, selectedLocation.name, monthDate);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (!ok) throw new Error("copy failed");
      }

      setCopyMessage("Monthly schedule copied.");
      window.setTimeout(() => setCopyMessage(""), 2500);
    } catch {
      setCopyMessage("Copy failed. Please copy manually for now.");
      window.setTimeout(() => setCopyMessage(""), 3000);
    }
  }

  function renderMaintenanceBanner() {
    if (!currentMaintenance?.text || currentMaintenance.status === "done") return null;

    const isActive = currentMaintenance.status === "active";
    const isPending = currentMaintenance.status === "pending";

    return (
      <div
        className={
          isActive
            ? "maintenance-banner maintenance-active"
            : "maintenance-banner maintenance-pending"
        }
      >
        <div className="maintenance-title">
          {isActive ? "Maintenance Note" : "Maintenance In Progress"}
        </div>

        {currentMaintenance.noteDate && currentMaintenance.noteShift && (
          <div className="maintenance-meta">
            {longDateLabel(currentMaintenance.noteDate)} •{" "}
            {compactShiftLabel(currentMaintenance.noteShift)}
          </div>
        )}

        <div className="maintenance-text">{currentMaintenance.text}</div>

        {isAdminRoute && adminSession && (
          <div className="maintenance-actions">
            {isActive && (
              <button onClick={markMaintenancePending} className="danger-btn small-btn">
                Pending
              </button>
            )}
            {isPending && (
              <button onClick={markMaintenanceDone} className="primary-btn small-btn">
                Done
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (isAdminRoute && !adminSession) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="intro-wrap">
            <div className="intro-box admin-login-box">
              <h1 className="hero-title">LBC Local Cart Admin</h1>
              <p className="hero-subtitle">Authorized access only.</p>

              <form onSubmit={handleAdminLogin} className="admin-login-form">
                <input
                  type="email"
                  placeholder="Admin email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="search-input"
                />

                <input
                  type="password"
                  placeholder="Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="search-input"
                />

                {adminError ? <div className="error-text">{adminError}</div> : null}

                <div className="center-row">
                  <button type="submit" className="primary-btn large-btn">
                    Sign In
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="container">
        {!isAdminRoute && (
          <div className="center-row" style={{ justifyContent: "flex-end", marginBottom: 16 }}>
            <button type="button" className="secondary-btn small-btn" onClick={goToAdminPage}>
              Admin
            </button>
          </div>
        )}
        {isAdminRoute && adminSession && (
          <div className="center-row" style={{ justifyContent: "flex-end", marginBottom: 16 }}>
            <button type="button" className="secondary-btn small-btn" onClick={exitAdminMode}>
              Exit Admin
            </button>
          </div>
        )}
        {!(activeTab === "booking" && page === "landing") && (
          <div className="top-tabs">
            <button
              onClick={() => {
                setActiveTab("booking");
                setPage("landing");
                setMessage("");
                setCopyMessage("");
              }}
              className="tab-btn"
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab("booking")}
              className={activeTab === "booking" ? "tab-btn active" : "tab-btn"}
            >
              Book Shift
            </button>
            <button
              onClick={() => setActiveTab("monthly")}
              className={activeTab === "monthly" ? "tab-btn active" : "tab-btn"}
            >
              Monthly Schedule
            </button>
            {isAdminRoute && adminSession && (
              <button
                onClick={() => setActiveTab("manageNames")}
                className={activeTab === "manageNames" ? "tab-btn active" : "tab-btn"}
              >
                Manage Names
              </button>
            )}
          </div>
        )}

        {isAdminRoute && adminSession && (
          <div className="center-row wrap gap">
            <div className="admin-live-badge">
              Signed in as {adminDisplayName || "Admin"}
            </div>
            <button onClick={handleAdminLogout} className="secondary-btn">
              Logout Admin
            </button>
          </div>
        )}

        {isAdminRoute && adminSession && activeTab === "manageNames" && (
          <div className="section-wrap wide">
            <div className="section-header compact">
              <h2 className="upper">Manage Names</h2>
              <div className="sub-strong">Publisher names</div>
              <div className="sub-muted">Adds/removes names stored at cart/publishers.names</div>
            </div>
            <div style={{ padding: 0, margin: "0 16px 12px 16px" }}>
              <div className="sub-muted" style={{ fontSize: 13 }}>
                Use this page to keep the publisher search list up to date.
              </div>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={newPublisherName}
                  onChange={(e) => setNewPublisherName(e.target.value)}
                  placeholder="Type publisher name"
                  className="search-input"
                />
                <button onClick={addPublisher} className="primary-btn">
                  Add Publisher
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                {(publishers || []).length === 0 ? (
                  <div className="empty-box">No publishers yet.</div>
                ) : (
                  (publishers || []).map((name) => (
                    <div key={name} className="monthly-name-chip" style={{ display: "inline-flex", alignItems: "center", margin: 6 }}>
                      <span style={{ marginRight: 8 }}>{name}</span>
                      <button onClick={() => removePublisher(name)} className="danger-btn small-btn">
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "booking" && page === "landing" && (
          <div className="landing-page">
            <div className="landing-hero church-landing">
              <div className="landing-copy">
                <div className="landing-kicker">LBC Local Cart Ministry</div>
                <h1 className="landing-title">Organized service, peaceful scheduling.</h1>
                <p className="landing-subtitle">
                  A simple congregation-style board for choosing locations, checking
                  available shifts, and keeping the cart schedule orderly.
                </p>

                <div className="landing-service-card">
                  <span>How It Works</span>
                  <strong>Choose a location, select a date, then book your shift.</strong>
                </div>

                <div className="landing-actions">
                  <button
                    onClick={() => {
                      setActiveTab("booking");
                      setPage("locations");
                    }}
                    className="primary-btn large-btn"
                  >
                    Enter Schedule
                  </button>
                  <button
                    onClick={() => setActiveTab("monthly")}
                    className="secondary-btn large-btn"
                  >
                    View Month
                  </button>
                </div>
              </div>

              <div className="hero-showcase">
                <div className="church-window hero-slideshow" aria-label="Local Cart slideshow">
                  {LANDING_HERO_SLIDES.map((slide, index) => (
                    <picture
                      key={slide.fallbackSrc}
                      className="hero-slide"
                      style={{ animationDelay: `${index * 4}s` }}
                    >
                      <source
                        type="image/webp"
                        media="(max-width: 700px)"
                        srcSet={slide.mobileSrc}
                      />
                      <source type="image/webp" srcSet={slide.desktopSrc} />
                      <img
                        src={slide.fallbackSrc}
                        alt={slide.alt}
                        loading={index === 0 ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={index === 0 ? "high" : "low"}
                      />
                    </picture>
                  ))}
                </div>
                <div className="service-board">
                  <span className="board-label">Local Cart</span>
                  <strong>3 Locations</strong>
                  <span>Kingdom Hall, Kalentong, Greenhills</span>
                </div>
              </div>
            </div>

            <div className="landing-strip">
              <div>
                <span>01</span>
                <strong>Choose cart location</strong>
              </div>
              <div>
                <span>02</span>
                <strong>Review the calendar</strong>
              </div>
              <div>
                <span>03</span>
                <strong>Confirm your shift</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === "booking" && page === "intro" && (
          <div className="intro-wrap">
            <div className="intro-box">
              <h1 className="hero-title">LBC Local Cart</h1>
              <p className="hero-subtitle">
                Local cart scheduling system. Choose a location and select your shift.
              </p>
              <button
                onClick={() => setPage("locations")}
                className="primary-btn large-btn"
              >
                Book Cart Shift
              </button>
            </div>
          </div>
        )}

        {activeTab === "booking" && page === "locations" && (
          <div className="section-wrap narrow">
            <div className="section-header">
              <h2>Choose Location</h2>
              <p>Select where you want to view and test available shifts.</p>
            </div>

            <div className="location-list">
              {LOCATIONS.map((location) => (
                <button
                  key={location.id}
                  onClick={() => enterLocation(location)}
                  className="location-card"
                >
                  <div>
                    <div className="location-title">{location.name}</div>
                    <div className="location-subtitle">
                      {location.capacity} slots per shift
                    </div>
                  </div>
                  <div className="pin">📍</div>
                </button>
              ))}
            </div>

            <div className="center-row">
              <button className="secondary-btn" onClick={() => setPage("landing")}>
                Back
              </button>
            </div>
          </div>
        )}

        {activeTab === "booking" && page === "calendar" && (
          <div className="section-wrap calendar-wrap">
            <div className="section-header compact">
              <h2 className="upper">{selectedLocation.name}</h2>
              <button
                type="button"
                className="details-line details-button"
                onClick={() => setRemindersOpen(true)}
              >
                ⓘ REMINDERS
              </button>
            </div>

            {renderMaintenanceBanner()}

            <div className="calendar-box">
              <div className="calendar-top">
                <button onClick={() => moveMonth(-1)} className="nav-btn">
                  ‹
                </button>
                <div className="month-title">{monthLabel(monthDate)}</div>
                <button onClick={() => moveMonth(1)} className="nav-btn">
                  ›
                </button>
              </div>

              <div className="weekday-row">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="weekday">
                    {day}
                  </div>
                ))}
              </div>

              <div className="calendar-grid">
                {calendarCells.map((cell, index) => {
                  if (!cell) return <div key={index} className="calendar-cell blank" />;

                  const iso = toISODate(cell);
                  const summary = getDaySummary(
                    selectedLocation.name,
                    iso,
                    bookingMap,
                    selectedLocation.capacity
                  );
                  const isCurrentMonth = cell.getMonth() === monthDate.getMonth();

                  let cellClass = "calendar-cell";
                  if (!isCurrentMonth) cellClass += " blank";
                  else if (summary.color === "full") cellClass += " full";
                  else if (summary.color === "almost") cellClass += " almost";
                  else if (summary.color === "partial") cellClass += " partial";

                  return (
                    <button
                      key={iso}
                      onClick={() => openDate(cell)}
                      className={cellClass}
                    >
                      {cell.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="center-row">
              <button
                onClick={() => setPage("locations")}
                className="primary-btn"
              >
                Back to Locations
              </button>
            </div>
          </div>
        )}

        {activeTab === "booking" && page === "details" && (
          <div className="section-wrap wide">
            <div className="section-header compact">
              <h2 className="upper">{selectedLocation.name}</h2>
              <button
                type="button"
                className="details-line details-button"
                onClick={() => setRemindersOpen(true)}
              >
                ⓘ REMINDERS
              </button>
              <div className="date-title">{longDateLabel(selectedDate)}</div>

            </div>

            {renderMaintenanceBanner()}

            <div className="shift-list">
              {currentShifts.map((shift) => {
                const entries = getShiftBookings(
                  bookingMap,
                  selectedLocation.name,
                  selectedDate,
                  shift
                );
                const bookedCount = entries.filter((e) => e.status === "booked").length;
                const waitingCount = entries.filter((e) => e.status === "waiting").length;
                const remaining = Math.max(0, selectedLocation.capacity - bookedCount);
                const style = getShiftCardStyle(bookedCount, selectedLocation.capacity);

                return (
                  <div key={shift} className="shift-card">
                    <div className={`shift-bar ${style.bar}`} />
                    <div className="shift-body">
                      <div className="shift-time">{shift}</div>
                      <div className="shift-remaining">
                        {bookedCount}/{selectedLocation.capacity} booked
                        {waitingCount > 0 && (
                          <div className="sub-muted" style={{ fontSize: 12, marginTop: 4 }}>
                            {waitingCount} waiting
                          </div>
                        )}
                      </div>
                      <div className={`shift-badge ${style.badgeClass}`}>
                        {style.badge}
                      </div>
                      <button
                        onClick={() => chooseShift(shift)}
                        className="primary-btn small-btn"
                        disabled={
                          bookedCount >= selectedLocation.capacity &&
                          waitingCount >= WAITING_LIST_LIMIT
                        }
                      >
                        {bookedCount >= selectedLocation.capacity
                          ? waitingCount >= WAITING_LIST_LIMIT
                            ? "Full"
                            : "Join Waiting List"
                          : "Book for This Shift"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="legend">
              <div>
                <span className="legend-box gray" /> No one booked yet
              </div>
              <div>
                <span className="legend-box green" /> Slots still available
              </div>
              <div>
                <span className="legend-box yellow" /> Almost Full
              </div>
              <div>
                <span className="legend-box red" /> Full
              </div>
            </div>

            <div className="center-row gap">
              <button
                className="secondary-btn"
                onClick={() => setPage("calendar")}
              >
                Back to Calendar
              </button>
              <button
                className="secondary-btn"
                onClick={() => setPage("locations")}
              >
                Change Location
              </button>
            </div>
          </div>
        )}

        {activeTab === "booking" && page === "names" && (
          <div className="section-wrap wide">
            <div className="section-header compact">
              <h2 className="upper">Choose Publisher</h2>
              <div className="sub-strong">{selectedLocation.name}</div>
              <div className="sub-muted">
                {longDateLabel(selectedDate)} • {selectedShift}
              </div>
            </div>

            {renderMaintenanceBanner()}

            <div className="names-wrap">
              <input
                type="text"
                value={nameQuery}
                onChange={(e) => {
                  setNameQuery(e.target.value);
                  setSearchTouched(true);
                }}
                placeholder="Search your name"
                className="search-input"
              />

              {selectedShiftBookings.filter((e) => e.status === "booked").length >= selectedLocation.capacity &&
                selectedShiftBookings.filter((e) => e.status === "waiting").length < WAITING_LIST_LIMIT && (
                <div className="empty-box">
                  This shift is full. You may join the waiting list.
                </div>
              )}

              {selectedShiftBookings.filter((e) => e.status === "booked").length >= selectedLocation.capacity &&
                selectedShiftBookings.filter((e) => e.status === "waiting").length >= WAITING_LIST_LIMIT && (
                <div className="empty-box">
                  This shift and waiting list are already full.
                </div>
              )}

              {searchTouched && nameQuery.trim() !== "" && !selectedName && (
                  <div className="search-results">
                    {filteredNames.length === 0 ? (
                      <div className="empty-box">No matching names.</div>
                    ) : (
                      filteredNames.map((name) => (
                        <button
                          key={name}
                          onClick={() => setSelectedName(name)}
                          className="name-option"
                        >
                          {name}
                        </button>
                      ))
                    )}
                  </div>
                )}

              {selectedName && (
                <div className="confirm-box">
                  <div className="confirm-title">
                    Confirm booking for this shift?
                  </div>
                  <div className="confirm-name">{selectedName}</div>
                  <div className="center-row gap">
                    <button onClick={confirmBooking} className="primary-btn">
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        setSelectedName("");
                        setSearchTouched(true);
                      }}
                      className="secondary-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {recentBooking && (
                <div className="pin-box" ref={pinCardRef}>
                  <div className="pin-title">Booking confirmed</div>
                  <div className="pin-note">
                    Save this PIN for cancellation of shift.
                  </div>
                  <div className="pin-code">{recentBooking.pin}</div>
                  <div className="pin-note">
                    {recentBooking.name} • {selectedLocation.name} •{" "}
                    {compactShiftLabel(selectedShift)}
                  </div>
                  <div className="center-row gap">
                    <button
                      onClick={savePinScreenshot}
                      className="primary-btn small-btn"
                    >
                      Save Screenshot
                    </button>
                  </div>
                </div>
              )}

              {showIssueForm && !currentMaintenance?.text && (
                <div className="report-box">
                  <div className="booked-title">Shift Notes</div>
                  <textarea
                    value={issueText}
                    onChange={(e) => setIssueText(e.target.value)}
                    placeholder="Write your shift notes here only if there is something that needs attention."
                    className="report-textarea"
                  />
                  <div className="center-row">
                    <button onClick={submitShiftNotes} className="primary-btn small-btn">
                      Submit Notes
                    </button>
                  </div>
                </div>
              )}

              {message ? (
                <div className="success-text center">{message}</div>
              ) : null}

              {(selectedShiftBookings.filter((e) => e.status === "booked").length > 0 || selectedShiftBookings.filter((e) => e.status === "waiting").length > 0) && (
                <div className="booked-box">
                  {selectedShiftBookings.filter((e) => e.status === "booked").length > 0 && (
                    <div>
                      <div className="booked-title">Booked for this shift</div>
                      {selectedShiftBookings.filter((e) => e.status === "booked").map((entry) => (
                        <button
                          key={`${entry.name}-${entry.bookedAt || Math.random()}`}
                          onClick={() => openCancelModal(entry, selectedShiftBookings.findIndex((it) => it === entry))}
                          className="booked-row"
                        >
                          <span>{entry.name}</span>
                          <span className="cancel-red">❌ Cancel</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedShiftBookings.filter((e) => e.status === "waiting").length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div className="booked-title">Waiting List</div>
                      {selectedShiftBookings.filter((e) => e.status === "waiting").map((entry, index) => (
                        <button
                          key={`${entry.name}-waiting-${entry.bookedAt || index}`}
                          onClick={() => openCancelModal(entry, selectedShiftBookings.findIndex((it) => it === entry))}
                          className="booked-row"
                        >
                          <span>{entry.name}</span>
                          <span className="cancel-red">❌ Remove</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="center-row">
              <button
                className="secondary-btn"
                onClick={() => setPage("details")}
              >
                Back to Shifts
              </button>
            </div>
          </div>
        )}

        {activeTab === "monthly" && (
          <div className="section-wrap full">
            <div className="section-header">
              <h2>Monthly Schedule</h2>
              <p>Use this view for reminders and screenshots.</p>
            </div>

            {renderMaintenanceBanner()}

            <div className="center-row wrap gap">
              {LOCATIONS.map((location) => (
                <button
                  key={location.id}
                  onClick={() => setSelectedLocation(location)}
                  className={
                    selectedLocation.name === location.name
                      ? "tab-btn active"
                      : "tab-btn"
                  }
                >
                  {location.name}
                </button>
              ))}
            </div>

            {isAdminRoute && adminSession && (
              <div className="center-row wrap gap">
                <button onClick={copyMonthlySchedule} className="primary-btn">
                  Copy GC Format
                </button>
                {selectedMonthlyBookings.length > 0 && (
                  <button
                    onClick={() => setMonthlyCancelConfirmOpen(true)}
                    className="danger-btn"
                  >
                    Cancel Booking ({selectedMonthlyBookings.length})
                  </button>
                )}
                {copyMessage ? (
                  <div className="success-text">{copyMessage}</div>
                ) : null}
              </div>
            )}

            <div className="calendar-month-box">
              <div className="calendar-top">
                <button onClick={() => moveMonth(-1)} className="nav-btn">
                  ‹
                </button>
                <div className="month-title">
                  {monthLabel(monthDate)} • {selectedLocation.name}
                </div>
                <button onClick={() => moveMonth(1)} className="nav-btn">
                  ›
                </button>
              </div>

              <div className="weekday-row wide">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="weekday">
                    {day}
                  </div>
                ))}
              </div>

              <div className="calendar-grid monthly-grid">
                {calendarCells.map((cell, index) => {
                  if (!cell) return <div key={index} className="month-day blank tall" />;

                  const iso = toISODate(cell);
                  const entries = getMonthlyEntries(
                    bookingMap,
                    selectedLocation.name,
                    iso
                  );
                  const summary = getDaySummary(
                    selectedLocation.name,
                    iso,
                    bookingMap,
                    selectedLocation.capacity
                  );
                  const monthDayClass =
                    summary.color === "empty"
                      ? "month-day tall"
                      : `month-day tall ${summary.color}`;

                  return (
                    <div key={iso} className={monthDayClass}>
                      <div className="month-day-num">{cell.getDate()}</div>
                      <div className="month-entries">
                        {entries.map((entry, idx) => {
                          const bookedCount = entry.entries.filter(
                            (person) => person.status === "booked"
                          ).length;
                          const entryStatus = getAvailabilityStatus(
                            bookedCount,
                            selectedLocation.capacity
                          );

                          return (
                          <div
                            key={`${entry.shift}-${idx}`}
                            className={`month-entry ${entryStatus}`}
                          >
                            <div className="month-entry-shift">
                              {compactShiftLabel(entry.shift)}
                            </div>
                            <div className="month-entry-names">
                              {(() => {
                                const booked = entry.entries.filter((p) => p.status === "booked");
                                const waiting = entry.entries.filter((p) => p.status === "waiting");

                                return (
                                  <div>
                                    {booked.map((person) => {
                                      const selected = isMonthlyBookingSelected(
                                        selectedLocation.name,
                                        iso,
                                        entry.shift,
                                        person.index
                                      );

                                      if (isAdminRoute && adminSession) {
                                        return (
                                          <button
                                            key={`${person.name}-${person.index}`}
                                            type="button"
                                            onClick={() =>
                                              toggleMonthlyBookingSelection(
                                                selectedLocation.name,
                                                iso,
                                                entry.shift,
                                                person.index
                                              )
                                            }
                                            className={
                                              selected
                                                ? "monthly-name-chip selected"
                                                : "monthly-name-chip"
                                            }
                                          >
                                            {person.name}
                                          </button>
                                        );
                                      }

                                      return (
                                        <span
                                          key={`${person.name}-${person.index}`}
                                          className="monthly-name-text"
                                        >
                                          {person.name}
                                        </span>
                                      );
                                    })}

                                    {waiting.length > 0 && (
                                      <div style={{ marginTop: 6 }}>
                                        <div className="sub-muted" style={{ fontSize: 12 }}>Waiting List</div>
                                        {waiting.map((person) => (
                                          isAdminRoute && adminSession ? (
                                            <button
                                              key={`${person.name}-w-${person.index}`}
                                              type="button"
                                              onClick={() =>
                                                toggleMonthlyBookingSelection(
                                                  selectedLocation.name,
                                                  iso,
                                                  entry.shift,
                                                  person.index
                                                )
                                              }
                                              className="monthly-waiting-chip"
                                            >
                                              {person.name}
                                            </button>
                                          ) : (
                                            <span key={`${person.name}-w-${person.index}`} className="monthly-name-text">
                                              {person.name}
                                            </span>
                                          )
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {cancelModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Cancel booking</h3>
            <p className="modal-subtitle">
              Enter the 4-digit PIN for <strong>{pendingCancelEntry?.name}</strong>
            </p>

            <div className="pin-display">{cancelPinInput || "----"}</div>

            <div className="keypad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  onClick={() => handleKeypadPress(num)}
                  className="keypad-btn"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => handleKeypadPress("clear")}
                className="keypad-btn keypad-alt"
              >
                Clear
              </button>
              <button
                onClick={() => handleKeypadPress("0")}
                className="keypad-btn"
              >
                0
              </button>
              <button
                onClick={() => handleKeypadPress("back")}
                className="keypad-btn keypad-alt"
              >
                ⌫
              </button>
            </div>

            <div className="center-row gap">
              <button onClick={cancelBookingWithPin} className="danger-btn">
                Confirm Cancel
              </button>
              <button onClick={closeCancelModal} className="secondary-btn">
                Close
              </button>
            </div>

            <button
              type="button"
              className="forgot-pin-link"
              onClick={() => setSupportModalOpen(true)}
            >
              Forgot PIN?
            </button>

            {isAdminRoute && adminSession && (
              <div className="admin-box">
                <div className="confirm-title">Admin tools</div>
                <div className="center-row gap">
                  <button onClick={adminCancelBooking} className="danger-btn">
                    Admin Cancel Without PIN
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {supportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card support-card">
            <h3 className="modal-title">Forgot PIN?</h3>
            <p className="support-note">
              If you forgot your PIN, please message us or chat in the GC so we
              can manually cancel the slot for you.
            </p>

            <div className="support-section">
              <div className="support-name">{ELDER_NAME}</div>
              <div className="support-actions">
                <a
                  href={ELDER_MESSENGER}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-btn support-link"
                >
                  Messenger
                </a>
              </div>
            </div>

            <div className="support-section">
              <div className="support-name">Bro. Justin Ico</div>
              <div className="support-actions">
                <a
                  href={JUSTIN_MESSENGER}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-btn support-link"
                >
                  Messenger
                </a>
              </div>
            </div>

            <div className="support-section">
              <div className="support-name">Report to GC</div>
              <div className="support-actions">
                <a
                  href={GC_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="primary-btn support-link"
                >
                  Open GC
                </a>
              </div>
            </div>

            <div className="center-row">
              <button
                onClick={() => setSupportModalOpen(false)}
                className="secondary-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {monthlyCancelConfirmOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Cancel selected bookings?</h3>
            <p className="modal-subtitle">
              This will remove {selectedMonthlyBookings.length} selected booking(s).
            </p>

            <div className="center-row gap">
              <button onClick={cancelSelectedMonthlyBookings} className="danger-btn">
                Confirm
              </button>
              <button
                onClick={() => setMonthlyCancelConfirmOpen(false)}
                className="secondary-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {remindersOpen && (
        <div className="modal-overlay">
          <div className="modal-card support-card">
            <h3 className="modal-title">Reminders</h3>
            <div className="reminders-list">
              {REMINDERS.map((item) => (
                <div key={item.title} className="reminder-item">
                  • <strong>{item.title}:</strong> {item.text}
                </div>
              ))}
            </div>
            <div className="center-row">
              <button onClick={() => setRemindersOpen(false)} className="secondary-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

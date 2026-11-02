import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

import { supabase } from "@/lib/supabase";
import { createTrip } from "@/lib/api";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type SearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type Destination = {
  id: string;
  name: string;
  coordinates: Coordinates | null;
};

type LocationField = "from" | string;

type RouteLeg = {
  distance: number;
};

const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #e5e7eb;
    }
    .leaflet-container { font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([12.9716, 77.5946], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const markers = {};
    let routeLine = null;

    function sendToApp(data) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    }

    map.on('click', function(event) {
      sendToApp({
        type: 'map-tap',
        latitude: event.latlng.lat,
        longitude: event.latlng.lng
      });
    });

    window.updateYaariMap = function(data) {
      const points = data.points || [];
      const activeIds = points.map(point => point.id);

      Object.keys(markers).forEach(id => {
        if (!activeIds.includes(id)) {
          map.removeLayer(markers[id]);
          delete markers[id];
        }
      });

      points.forEach(point => {
        const position = [point.latitude, point.longitude];

        if (markers[point.id]) {
          markers[point.id].setLatLng(position);
        } else {
          const marker = L.marker(position, {
            draggable: true,
            title: point.title
          }).addTo(map);

          marker.on('dragend', function(event) {
            const dragged = event.target.getLatLng();
            sendToApp({
              type: 'marker-drag',
              field: point.id,
              latitude: dragged.lat,
              longitude: dragged.lng
            });
          });

          markers[point.id] = marker;
        }

        markers[point.id].bindPopup(point.title);
      });

      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }

      if (data.route && data.route.length > 0) {
        routeLine = L.polyline(data.route, {
          color: '#2563EB',
          weight: 5
        }).addTo(map);
      }

      if (data.fitRoute && points.length > 0) {
        const bounds = L.latLngBounds(
          points.map(point => [point.latitude, point.longitude])
        );
        map.fitBounds(bounds, { padding: [35, 35] });
      }
    };

    window.moveYaariMap = function(latitude, longitude) {
      map.setView([latitude, longitude], 15);
    };

    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'map-ready' })
    );
  </script>
</body>
</html>
`;

const createDestination = (): Destination => ({
  id: `destination-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  coordinates: null,
});

// Automatically formats Indian registration input as KA 03 CA 2135.
const formatIndianVehicleNumber = (value: string) => {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const state = raw.slice(0, 2).replace(/[^A-Z]/g, "");
  const remainder = raw.slice(state.length);
  const rto = remainder.slice(0, 2).replace(/[^0-9]/g, "");
  const afterRto = remainder.slice(2);
  const series = afterRto.slice(0, 3).replace(/[^A-Z]/g, "");
  const vehicleDigits = afterRto.slice(series.length).replace(/[^0-9]/g, "").slice(0, 4);
  return [state, rto, series, vehicleDigits].filter(Boolean).join(" ");
};

export default function CreateTripScreen() {
  const mapRef = useRef<WebView>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const searchRequestId = useRef(0);
  const routeRequestId = useRef(0);

  // Trip identity and itinerary
  const [tripName, setTripName] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [fromCoords, setFromCoords] = useState<Coordinates | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([
    createDestination(),
  ]);
  const [activeField, setActiveField] = useState<LocationField | null>(null);
  const [mapTarget, setMapTarget] = useState<LocationField>("from");

  // Search
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Map and road route
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinates[]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeLegs, setRouteLegs] = useState<RouteLeg[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Trip details
  const today = new Date();

  const toDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };

  const formatDate = (value: string) =>
    value
      ? parseDate(value).toLocaleDateString(undefined, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Select date";

  const [tripDate, setTripDate] = useState(toDateString(today));
  const [tripEndDate, setTripEndDate] = useState(toDateString(today));
  const [showDatePicker, setShowDatePicker] = useState<"start" | "end" | null>(null);
  const [departureTime, setDepartureTime] = useState("");
  const [selectedTime, setSelectedTime] = useState(() => {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    return date;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [availableSeats, setAvailableSeats] = useState("");
  const [tripCost, setTripCost] = useState("");
  const [travelType, setTravelType] = useState("Car");
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const isPersonalVehicle = ["Car", "Bike", "Other"].includes(travelType);

  const MINIMUM_TRIP_DISTANCE = 50000;

  const normalizedVehicleNumber = vehicleNumber
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");

  const indianRegistrationPattern =
    /^[A-Z]{2} \d{2} [A-Z]{1,3} \d{1,4}$/;

  const isVehicleNumberValid =
    indianRegistrationPattern.test(normalizedVehicleNumber);

  const isDistanceInvalid =
    routeDistance !== null && routeDistance < MINIMUM_TRIP_DISTANCE;

  const isVehicleNumberInvalid =
    isPersonalVehicle &&
    vehicleNumber.trim().length > 0 &&
    !isVehicleNumberValid;

  const selectedDestination = (id: string) =>
    destinations.find((destination) => destination.id === id);

  const searchText =
    activeField === "from"
      ? fromLocation
      : activeField
      ? selectedDestination(activeField)?.name ?? ""
      : "";

  // ---------------------------------------
  // DESTINATION CONTROLS
  // ---------------------------------------

  const addDestination = () => {
    if (destinations.length >= 20) {
      Alert.alert("Destination limit", "A trip can have up to 20 destinations.");
      return;
    }

    setDestinations((previous) => [...previous, createDestination()]);
  };

  const removeDestination = (id: string) => {
    if (destinations.length <= 1) {
      Alert.alert("At least one destination", "A trip must have at least one destination.");
      return;
    }

    setDestinations((previous) =>
      previous.filter((destination) => destination.id !== id)
    );

    if (activeField === id) {
      setActiveField(null);
      setSuggestions([]);
    }

    if (mapTarget === id) setMapTarget("from");
  };

  const updateDestination = (id: string, changes: Partial<Destination>) => {
    setDestinations((previous) =>
      previous.map((destination) =>
        destination.id === id ? { ...destination, ...changes } : destination
      )
    );
  };

  const moveDestination = (id: string, direction: "up" | "down") => {
    setDestinations((previous) => {
      const index = previous.findIndex((destination) => destination.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= previous.length) {
        return previous;
      }

      const updated = [...previous];
      [updated[index], updated[targetIndex]] = [
        updated[targetIndex],
        updated[index],
      ];
      return updated;
    });
  };

  // ---------------------------------------
  // MAP BRIDGE
  // ---------------------------------------

  const moveMapTo = (coordinates: Coordinates) => {
    mapRef.current?.injectJavaScript(`
      window.moveYaariMap(${coordinates.latitude}, ${coordinates.longitude});
      true;
    `);
  };

  useEffect(() => {
    if (!mapLoaded) return;

    const mapPoints = [
      ...(fromCoords
        ? [{
            id: "from",
            latitude: fromCoords.latitude,
            longitude: fromCoords.longitude,
            title: "Pickup location",
          }]
        : []),
      ...destinations
        .filter((destination) => destination.coordinates)
        .map((destination, index) => ({
          id: destination.id,
          latitude: destination.coordinates!.latitude,
          longitude: destination.coordinates!.longitude,
          title: `Destination ${index + 1}: ${destination.name || "Selected location"}`,
        })),
    ];

    const mapData = {
      points: mapPoints,
      route: routeCoordinates.map((point) => [
        point.latitude,
        point.longitude,
      ]),
      fitRoute: mapPoints.length > 1 && routeCoordinates.length > 0,
    };

    mapRef.current?.injectJavaScript(`
      window.updateYaariMap(${JSON.stringify(mapData)});
      true;
    `);
  }, [mapLoaded, fromCoords, destinations, routeCoordinates]);

  // ---------------------------------------
  // LOCATION SEARCH - OPENSTREETMAP
  // ---------------------------------------

  useEffect(() => {
    if (!activeField || searchText.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const requestId = ++searchRequestId.current;

    const timer = setTimeout(async () => {
      try {
        setSearching(true);

        const url =
          "https://nominatim.openstreetmap.org/search?" +
          `format=jsonv2&limit=5&q=${encodeURIComponent(searchText.trim())}`;

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "Accept-Language": "en",
            "User-Agent": "YAARI-Travel-App/1.0",
          },
        });

        if (!response.ok) throw new Error("Location search failed");

        const data: SearchResult[] = await response.json();

        if (requestId === searchRequestId.current) {
          setSuggestions(data);
        }
      } catch (error) {
        console.log("Location search error:", error);
        if (requestId === searchRequestId.current) setSuggestions([]);
      } finally {
        if (requestId === searchRequestId.current) setSearching(false);
      }
    }, 1100);

    return () => {
      clearTimeout(timer);
      searchRequestId.current++;
    };
  }, [searchText, activeField]);

  // ---------------------------------------
  // REVERSE GEOCODING
  // ---------------------------------------

  const reverseGeocode = async (coordinates: Coordinates): Promise<string> => {
    try {
      const url =
        "https://nominatim.openstreetmap.org/reverse?" +
        `format=jsonv2&lat=${coordinates.latitude}&lon=${coordinates.longitude}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en",
          "User-Agent": "YAARI-Travel-App/1.0",
        },
      });

      if (!response.ok) throw new Error("Unable to identify this location");

      const data = await response.json();
      return (
        data.name ||
        data.display_name ||
        `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
      );
    } catch (error) {
      console.log("Reverse geocoding error:", error);
      return `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`;
    }
  };

  // ---------------------------------------
  // SELECT SEARCH RESULT
  // ---------------------------------------

  const selectSearchResult = (item: SearchResult) => {
    const coordinates: Coordinates = {
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    };

    if (activeField === "from") {
      setFromLocation(item.display_name);
      setFromCoords(coordinates);
      setMapTarget("from");
    } else if (activeField) {
      updateDestination(activeField, {
        name: item.display_name,
        coordinates,
      });
      setMapTarget(activeField);
    }

    setSuggestions([]);
    setActiveField(null);
    Keyboard.dismiss();
    moveMapTo(coordinates);
  };

  // ---------------------------------------
  // CURRENT LOCATION
  // ---------------------------------------

  const useCurrentLocation = async () => {
    try {
      setLocationLoading(true);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert(
          "Location permission",
          "Please allow location access to use your current location."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordinates: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const address = await reverseGeocode(coordinates);

      setFromLocation(address);
      setFromCoords(coordinates);
      setMapTarget("from");
      setActiveField(null);
      setSuggestions([]);
      moveMapTo(coordinates);
    } catch (error) {
      console.error("Current location error:", error);
      Alert.alert("Location unavailable", "Unable to detect your current location.");
    } finally {
      setLocationLoading(false);
    }
  };

  // ---------------------------------------
  // MAP TAP AND MARKER DRAG
  // ---------------------------------------

  const selectMapLocation = async (coordinates: Coordinates) => {
    const address = await reverseGeocode(coordinates);

    if (mapTarget === "from") {
      setFromLocation(address);
      setFromCoords(coordinates);
    } else {
      updateDestination(mapTarget, { name: address, coordinates });
    }

    setActiveField(null);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const moveMarker = async (field: string, coordinates: Coordinates) => {
    const address = await reverseGeocode(coordinates);

    if (field === "from") {
      setFromCoords(coordinates);
      setFromLocation(address);
    } else {
      updateDestination(field, { coordinates, name: address });
    }
  };

  // ---------------------------------------
  // ROAD ROUTE - OSRM, ALL WAYPOINTS
  // ---------------------------------------

  useEffect(() => {
    const allDestinationsSelected =
      destinations.length > 0 &&
      destinations.every(
        (destination) =>
          destination.name.trim().length > 0 && destination.coordinates !== null
      );

    if (!fromCoords || !allDestinationsSelected) {
      setRouteCoordinates([]);
      setRouteDistance(null);
      setRouteLegs([]);
      setRouteLoading(false);
      return;
    }

    const requestId = ++routeRequestId.current;

    const getRoute = async () => {
      try {
        setRouteLoading(true);

        const points = [
          fromCoords,
          ...destinations.map((destination) => destination.coordinates!),
        ];

        const coordinatePath = points
          .map((point) => `${point.longitude},${point.latitude}`)
          .join(";");

        const url =
          `https://router.project-osrm.org/route/v1/driving/${coordinatePath}` +
          "?overview=full&geometries=geojson&steps=false";

        const response = await fetch(url);
        if (!response.ok) throw new Error("Route service unavailable");

        const data = await response.json();
        if (!data.routes || data.routes.length === 0) {
          throw new Error("No road route found for this itinerary");
        }

        if (requestId !== routeRequestId.current) return;

        const route = data.routes[0];
        const pointsOnRoute: Coordinates[] = route.geometry.coordinates.map(
          (point: number[]) => ({
            longitude: point[0],
            latitude: point[1],
          })
        );

        setRouteCoordinates(pointsOnRoute);
        setRouteDistance(route.distance);
        setRouteLegs(
          (route.legs || []).map((leg: RouteLeg) => ({
            distance: leg.distance,
          }))
        );
      } catch (error) {
        console.error("Route error:", error);

        if (requestId === routeRequestId.current) {
          setRouteCoordinates([]);
          setRouteDistance(null);
          setRouteLegs([]);
          Alert.alert(
            "Route unavailable",
            "YAARI could not calculate the complete road route. Please check the selected locations and try again."
          );
        }
      } finally {
        if (requestId === routeRequestId.current) setRouteLoading(false);
      }
    };

    getRoute();

    return () => {
      routeRequestId.current++;
    };
  }, [fromCoords, destinations]);

  // ---------------------------------------
  // FORMAT DISTANCE
  // ---------------------------------------

  const formatDistance = (meters: number) =>
    meters >= 1000
      ? `${(meters / 1000).toFixed(2)} km`
      : `${Math.round(meters)} m`;

  // ---------------------------------------
  // DATE AND TIME PICKERS
  // ---------------------------------------

  const handleDateValueChange = (_event: any, date?: Date) => {
    const field = showDatePicker;
    setShowDatePicker(null);
    if (!date || !field) return;

    const value = toDateString(date);

    if (field === "start") {
      setTripDate(value);
      if (tripEndDate < value) setTripEndDate(value);
    } else {
      if (value < tripDate) {
        Alert.alert("Invalid end date", "End date cannot be before the start date.");
        return;
      }
      setTripEndDate(value);
    }
  };

  const handleTimeValueChange = (_event: any, date?: Date) => {
    setShowTimePicker(false);
    if (!date) return;

    setSelectedTime(date);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    setDepartureTime(`${hours}:${minutes}`);
  };

  const tripDurationDays = (() => {
    if (!tripDate || !tripEndDate) return 0;
    const difference = Math.round(
      (parseDate(tripEndDate).getTime() - parseDate(tripDate).getTime()) /
        86400000
    );
    return difference >= 0 ? difference + 1 : 0;
  })();

  // ---------------------------------------
  // CREATE TRIP
  // ---------------------------------------

  const handleCreateTrip = async () => {
    const validDestinations = destinations.every(
      (destination) =>
        destination.name.trim().length > 0 && destination.coordinates !== null
    );

    if (!tripName.trim()) {
      Alert.alert("Trip name required", "Please enter a name for your trip.");
      return;
    }

    if (!fromLocation.trim() || !fromCoords) {
      Alert.alert(
        "Pickup required",
        "Please select your starting location from search suggestions or the map."
      );
      return;
    }

    if (!validDestinations) {
      Alert.alert(
        "Destinations required",
        "Please select a name and map location for every destination."
      );
      return;
    }

    if (routeLoading || routeDistance === null || routeLegs.length !== destinations.length) {
      Alert.alert(
        "Route not ready",
        "Please wait until YAARI calculates the complete road distance."
      );
      return;
    }
    if (isDistanceInvalid) {
      Alert.alert(
        "Minimum distance required",
        `YAARI requires a minimum road distance of 50 km. Your current route is ${formatDistance(routeDistance)}. Please add or change destinations.`
      );
      return;
    }

    if (!tripDate || !tripEndDate || !departureTime) {
      Alert.alert(
        "Missing information",
        "Please select start date, end date and departure time."
      );
      return;
    }

    if (tripEndDate < tripDate) {
      Alert.alert("Invalid dates", "Trip end date cannot be before the start date.");
      return;
    }

    if (!availableSeats.trim() || !tripCost.trim()) {
      Alert.alert("Missing information", "Please enter seats and trip cost.");
      return;
    }

    const seats = Number(availableSeats);
    const cost = Number(tripCost);

    if (!Number.isInteger(seats) || seats <= 0) {
      Alert.alert("Invalid seats", "Available seats must be a positive whole number.");
      return;
    }

    if (!Number.isFinite(cost) || cost < 0) {
      Alert.alert("Invalid cost", "Enter a valid trip cost.");
      return;
    }

    if (isPersonalVehicle && (!vehicleName.trim() || !vehicleNumber.trim())) {
      Alert.alert(
        "Vehicle details required",
        "Please enter both the vehicle name and registration number."
      );
      return;
    }

    if (isPersonalVehicle && !isVehicleNumberValid) {
      Alert.alert(
        "Invalid vehicle number",
        "Please enter your vehicle registration in the format KA 03 CA 2135."
      );
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Login required", "Please log in before creating a trip.");
        return;
      }

      const finalDestinations = destinations.map((destination) => ({
        destination_name: destination.name.trim(),
        latitude: destination.coordinates!.latitude,
        longitude: destination.coordinates!.longitude,
      }));

      await createTrip({
        creator_id: user.id,
        trip_name: tripName.trim(),
        from_location: fromLocation.trim(),
        to_location: finalDestinations[finalDestinations.length - 1].destination_name,
        pickup_latitude: fromCoords.latitude,
        pickup_longitude: fromCoords.longitude,
        destinations: finalDestinations,
        trip_date: tripDate,
        trip_end_date: tripEndDate,
        departure_time: departureTime,
        available_seats: seats,
        trip_cost: cost,
        travel_type: travelType,
        vehicle_name: isPersonalVehicle ? vehicleName.trim() : undefined,
        vehicle_number: isPersonalVehicle ? vehicleNumber.trim() : undefined,
        description: description.trim(),
      });

      Alert.alert(
        "Trip created",
        `Your trip was created successfully. Total road distance: ${formatDistance(routeDistance)}.`,
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
      );
    } catch (error) {
      console.error("Create trip failed:", error);
      Alert.alert(
        "Unable to create trip",
        error instanceof Error
          ? error.message
          : "Something went wrong while creating your trip."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------
  // REUSABLE LOCATION INPUT
  // ---------------------------------------

  const renderLocationInput = (
    field: LocationField,
    label: string,
    value: string,
    placeholder: string,
    icon: string
  ) => {
    const isActive = activeField === field;

    const updateValue = (text: string) => {
      if (field === "from") {
        setFromLocation(text);
        setFromCoords(null);
      } else {
        updateDestination(field, { name: text, coordinates: null });
      }
      setActiveField(field);
    };

    const clearValue = () => {
      if (field === "from") {
        setFromLocation("");
        setFromCoords(null);
      } else {
        updateDestination(field, { name: "", coordinates: null });
      }
      setSuggestions([]);
      setActiveField(field);
    };

    return (
      <View className="mb-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-gray-700">{label}</Text>

          {field === "from" && (
            <Pressable
              onPress={useCurrentLocation}
              disabled={locationLoading}
              className="flex-row items-center"
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Text className="text-sm font-semibold text-blue-600">
                  ◎ Current location
                </Text>
              )}
            </Pressable>
          )}
        </View>

        <View
          className={`flex-row items-center rounded-2xl border bg-white px-4 ${
            isActive ? "border-blue-500" : "border-gray-200"
          }`}
        >
          <Text className="mr-3 text-xl">{icon}</Text>

          <TextInput
            value={value}
            onChangeText={updateValue}
            onFocus={() => {
              setActiveField(field);
              setMapTarget(field);
            }}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            className="flex-1 py-4 text-base text-gray-900"
          />

          {value.length > 0 && (
            <Pressable onPress={clearValue}>
              <Text className="px-2 text-lg text-gray-400">×</Text>
            </Pressable>
          )}
        </View>

        {isActive && searching && (
          <View className="mt-2 flex-row items-center px-2">
            <ActivityIndicator size="small" color="#2563EB" />
            <Text className="ml-2 text-sm text-gray-500">
              Searching locations...
            </Text>
          </View>
        )}

        {isActive && suggestions.length > 0 && (
          <View className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {suggestions.map((item) => (
              <Pressable
                key={item.place_id}
                onPress={() => selectSearchResult(item)}
                className="flex-row items-center border-b border-gray-100 px-4 py-4"
              >
                <Text className="mr-3 text-lg">📍</Text>
                <Text
                  className="flex-1 text-sm text-gray-800"
                  numberOfLines={2}
                >
                  {item.display_name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ---------------------------------------
  // SCREEN UI
  // ---------------------------------------

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <View className="px-5 pb-12 pt-8">
        <Text className="text-3xl font-bold text-gray-900">Create a Trip</Text>
        <Text className="mt-2 text-base text-gray-500">
          Plan your complete journey and invite others to join.
        </Text>

        {/* TRIP NAME */}
        <View className="mt-7">
          <Text className="mb-2 text-sm font-bold text-gray-700">
            TRIP NAME *
          </Text>
          <TextInput
            value={tripName}
            onChangeText={setTripName}
            placeholder="e.g. Bengaluru Coastal Journey"
            placeholderTextColor="#9CA3AF"
            maxLength={150}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
          />
        </View>

        {/* ITINERARY */}
        <View className="mt-7">
          <Text className="mb-3 text-lg font-bold text-gray-900">
            Your itinerary
          </Text>

          {renderLocationInput(
            "from",
            "STARTING POINT *",
            fromLocation,
            "Search starting location",
            "●"
          )}

          {destinations.map((destination, index) => (
            <View
              key={destination.id}
              className="mb-2 rounded-2xl border border-gray-200 bg-gray-100 p-3"
            >
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-bold text-gray-700">
                  DESTINATION {index + 1} *
                </Text>

                <View className="flex-row items-center gap-4">
                  <Pressable
                    onPress={() => moveDestination(destination.id, "up")}
                    disabled={index === 0}
                  >
                    <Text className={index === 0 ? "text-gray-300" : "text-blue-600"}>
                      ↑
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => moveDestination(destination.id, "down")}
                    disabled={index === destinations.length - 1}
                  >
                    <Text
                      className={
                        index === destinations.length - 1
                          ? "text-gray-300"
                          : "text-blue-600"
                      }
                    >
                      ↓
                    </Text>
                  </Pressable>

                  <Pressable onPress={() => removeDestination(destination.id)}>
                    <Text className="font-semibold text-red-500">Remove</Text>
                  </Pressable>
                </View>
              </View>

              {renderLocationInput(
                destination.id,
                `DESTINATION ${index + 1}`,
                destination.name,
                "Search destination",
                "📍"
              )}
            </View>
          ))}

          <Pressable
            onPress={addDestination}
            className="mt-2 items-center rounded-2xl border border-dashed border-blue-400 bg-blue-50 px-4 py-4"
          >
            <Text className="font-bold text-blue-700">+ Add another destination</Text>
          </Pressable>

          <Text className="mt-2 text-xs text-gray-500">
            Destination order determines the route. You can reorder stops before creating the trip.
          </Text>
        </View>

        {/* MAP */}
        <View className="mt-7">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">
              Route map
            </Text>
            <Text className="text-xs text-gray-500">Tap map to place selected pin</Text>
          </View>

          <View className="mb-3 flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => setMapTarget("from")}
              className={`rounded-xl border px-3 py-3 ${
                mapTarget === "from"
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <Text
                className={`font-semibold ${
                  mapTarget === "from" ? "text-blue-700" : "text-gray-600"
                }`}
              >
                ● Starting point
              </Text>
            </Pressable>

            {destinations.map((destination, index) => (
              <Pressable
                key={destination.id}
                onPress={() => setMapTarget(destination.id)}
                className={`rounded-xl border px-3 py-3 ${
                  mapTarget === destination.id
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <Text
                  className={`font-semibold ${
                    mapTarget === destination.id
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  ● Stop {index + 1}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
            <WebView
              ref={mapRef}
              source={{ html: MAP_HTML }}
              style={{
                width: "100%",
                height: 320,
                backgroundColor: "#e5e7eb",
              }}
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);

                  if (data.type === "map-ready") setMapLoaded(true);

                  if (data.type === "map-tap") {
                    selectMapLocation({
                      latitude: data.latitude,
                      longitude: data.longitude,
                    });
                  }

                  if (data.type === "marker-drag") {
                    moveMarker(data.field, {
                      latitude: data.latitude,
                      longitude: data.longitude,
                    });
                  }
                } catch (error) {
                  console.log("Map message error:", error);
                }
              }}
            />

            <View className="bg-white px-4 py-3">
              <Text className="text-xs text-gray-500">Currently moving:</Text>
              <Text className="font-semibold text-gray-800">
                {mapTarget === "from"
                  ? "Starting point"
                  : `Destination ${destinations.findIndex(
                      (destination) => destination.id === mapTarget
                    ) + 1}`}
              </Text>
            </View>
          </View>

          {routeLoading && (
            <View className="mt-4 flex-row items-center">
              <ActivityIndicator color="#2563EB" />
              <Text className="ml-2 text-sm text-gray-500">
                Calculating complete road route...
              </Text>
            </View>
          )}

          {routeDistance !== null && !routeLoading && (
            <View className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <Text className="text-xs font-semibold text-blue-700">
                TOTAL ROAD DISTANCE
              </Text>
              <Text className="mt-1 text-2xl font-bold text-blue-900">
                {formatDistance(routeDistance)}
              </Text>

              <View className="mt-3 border-t border-blue-100 pt-2">
                {routeLegs.map((leg, index) => (
                  <View
                    key={`${destinations[index]?.id ?? index}-distance`}
                    className="flex-row items-center justify-between py-1"
                  >
                    <Text className="flex-1 text-sm text-blue-800">
                      {index === 0
                        ? `Starting point → ${destinations[index]?.name || `Stop ${index + 1}`}`
                        : `${destinations[index - 1]?.name || `Stop ${index}`} → ${destinations[index]?.name || `Stop ${index + 1}`}`}
                    </Text>
                    <Text className="ml-3 text-sm font-semibold text-blue-900">
                      {formatDistance(leg.distance)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {isDistanceInvalid && !routeLoading && (
            <View className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <Text className="font-bold text-red-700">
                ⚠ Minimum distance not met
              </Text>
              <Text className="mt-1 text-sm text-red-600">
                YAARI requires at least 50 km. Your current route is{" "}
                {formatDistance(routeDistance!)}. Please add or change destinations.
              </Text>
            </View>
          )}
        </View>

        {/* DATES */}
        <View className="mt-7">
          <Text className="mb-2 text-sm font-bold text-gray-700">
            TRIP START DATE *
          </Text>
          <Pressable
            onPress={() => setShowDatePicker("start")}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4"
          >
            <Text className="text-base text-gray-800">{formatDate(tripDate)}</Text>
          </Pressable>
        </View>

        <View className="mt-5">
          <Text className="mb-2 text-sm font-bold text-gray-700">
            TRIP END DATE *
          </Text>
          <Pressable
            onPress={() => setShowDatePicker("end")}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4"
          >
            <Text className="text-base text-gray-800">{formatDate(tripEndDate)}</Text>
          </Pressable>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={parseDate(showDatePicker === "start" ? tripDate : tripEndDate)}
            mode="date"
            minimumDate={
              showDatePicker === "start"
                ? new Date(new Date().setHours(0, 0, 0, 0))
                : parseDate(tripDate)
            }
            onValueChange={handleDateValueChange}
            onDismiss={() => setShowDatePicker(null)}
          />
        )}

        <View className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <Text className="text-sm font-semibold text-blue-800">TRIP DURATION</Text>
          <Text className="mt-1 text-xl font-bold text-blue-900">
            {tripDurationDays} {tripDurationDays === 1 ? "day" : "days"}
          </Text>
          <Text className="mt-1 text-xs text-blue-700">
            Start and end dates are both counted.
          </Text>
        </View>

        {/* DEPARTURE TIME */}
        <View className="mt-5">
          <Text className="mb-2 text-sm font-bold text-gray-700">
            DEPARTURE TIME *
          </Text>
          <Pressable
            onPress={() => setShowTimePicker(true)}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4"
          >
            <Text
              className={`text-base ${
                departureTime ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {departureTime
                ? (() => {
                    const [hours, minutes] = departureTime.split(":").map(Number);
                    const displayDate = new Date();
                    displayDate.setHours(hours, minutes, 0, 0);
                    return displayDate.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                  })()
                : "Select departure time"}
            </Text>
          </Pressable>

          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour={false}
              display="default"
              onValueChange={handleTimeValueChange}
              onDismiss={() => setShowTimePicker(false)}
            />
          )}
        </View>

        {/* SEATS AND COST */}
        <View className="mt-5 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-2 text-sm font-bold text-gray-700">
              AVAILABLE SEATS *
            </Text>
            <TextInput
              value={availableSeats}
              onChangeText={setAvailableSeats}
              placeholder="3"
              keyboardType="number-pad"
              placeholderTextColor="#9CA3AF"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
            />
          </View>

          <View className="flex-1">
            <Text className="mb-2 text-sm font-bold text-gray-700">
              COST (₹) *
            </Text>
            <TextInput
              value={tripCost}
              onChangeText={setTripCost}
              placeholder="1500"
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
            />
          </View>
        </View>

        {/* TRAVEL TYPE */}
        <View className="mt-5">
          <Text className="mb-3 text-sm font-bold text-gray-700">TRAVEL TYPE</Text>
          <View className="flex-row flex-wrap gap-3">
            {["Car", "Bike", "Other"].map((type) => (
              <Pressable
                key={type}
                onPress={() => setTravelType(type)}
                className={`rounded-full border px-5 py-3 ${
                  travelType === type
                    ? "border-blue-600 bg-blue-600"
                    : "border-gray-200 bg-white"
                }`}
              >
                <Text
                  className={`font-semibold ${
                    travelType === type ? "text-white" : "text-gray-700"
                  }`}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="mt-2 text-xs text-gray-500">
            Road distance is currently calculated using the driving route profile.
          </Text>
        </View>

        {/* VEHICLE DETAILS */}
        {isPersonalVehicle && (
          <View className="mt-5">
            <Text className="mb-2 text-sm font-bold text-gray-700">
              VEHICLE NAME *
            </Text>
            <TextInput
              value={vehicleName}
              onChangeText={setVehicleName}
              placeholder="e.g. Hyundai Creta"
              placeholderTextColor="#9CA3AF"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
            />

            <Text className="mb-2 mt-4 text-sm font-bold text-gray-700">
              VEHICLE REGISTRATION NUMBER *
            </Text>
            <TextInput
              value={vehicleNumber}
              onChangeText={(value) =>
                setVehicleNumber(formatIndianVehicleNumber(value))
              }
              placeholder="e.g. KA 03 CA 2135"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={13}
              placeholderTextColor="#9CA3AF"
              className={`rounded-2xl border bg-white px-4 py-4 text-base text-gray-900 ${
                isVehicleNumberInvalid ? "border-red-400" : "border-gray-200"
              }`}
            />
            {isVehicleNumberInvalid ? (
              <Text className="mt-2 text-sm font-medium text-red-600">
                ⚠ Invalid registration number. Use format: KA 03 CA 2135.
              </Text>
            ) : (
              <Text className="mt-2 text-xs text-gray-500">
                Enter state code, RTO code, series and vehicle number.
                Example: KA 03 CA 2135.
              </Text>
            )}
          </View>
        )}

        {/* DESCRIPTION */}
        <View className="mt-5">
          <Text className="mb-2 text-sm font-bold text-gray-700">DESCRIPTION</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Tell travellers something about your journey..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="min-h-28 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
          />
        </View>

        {/* CREATE */}
        <Pressable
          onPress={handleCreateTrip}
          disabled={loading || isDistanceInvalid || isVehicleNumberInvalid}
          className={`mt-8 items-center rounded-2xl px-6 py-4 ${
            loading || isDistanceInvalid || isVehicleNumberInvalid
              ? "bg-blue-300"
              : "bg-blue-600"
          }`}
        >
          {loading ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="white" />
              <Text className="ml-3 font-semibold text-white">
                Creating Trip...
              </Text>
            </View>
          ) : (
            <Text className="text-base font-bold text-white">Create Trip</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
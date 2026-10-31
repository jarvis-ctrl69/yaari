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
import MapView, {
  Marker,
  Polyline,
  Region,
} from "react-native-maps";
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

type LocationField = "from" | "to";

const INITIAL_REGION: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function CreateTripScreen() {
  const mapRef = useRef<MapView>(null);
  const searchRequestId = useRef(0);
  const routeRequestId = useRef(0);

  // Locations
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");

  const [fromCoords, setFromCoords] =
    useState<Coordinates | null>(null);

  const [toCoords, setToCoords] =
    useState<Coordinates | null>(null);

  const [activeField, setActiveField] =
    useState<LocationField | null>(null);

  const [mapTarget, setMapTarget] =
    useState<LocationField>("from");

  // Search
  const [suggestions, setSuggestions] =
    useState<SearchResult[]>([]);

  const [searching, setSearching] = useState(false);

  // Map and route
  const [routeCoordinates, setRouteCoordinates] =
    useState<Coordinates[]>([]);

  const [routeDistance, setRouteDistance] = useState<number | null>(
    null
  );

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
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);

  // Current search text
  const searchText =
    activeField === "from"
      ? fromLocation
      : activeField === "to"
      ? toLocation
      : "";

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
          `format=jsonv2&limit=5&q=${encodeURIComponent(
            searchText.trim()
          )}`;

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "Accept-Language": "en",
            "User-Agent": "YAARI-Travel-App/1.0",
          },
        });

        if (!response.ok) {
          throw new Error("Location search failed");
        }

        const data: SearchResult[] = await response.json();

        if (requestId === searchRequestId.current) {
          setSuggestions(data);
        }
      } catch (error) {
        console.log("Location search error:", error);

        if (requestId === searchRequestId.current) {
          setSuggestions([]);
        }
      } finally {
        if (requestId === searchRequestId.current) {
          setSearching(false);
        }
      }
    }, 1100);

    return () => {
      clearTimeout(timer);
      searchRequestId.current++;
    };
  }, [searchText, activeField]);

  // ---------------------------------------
  // REVERSE GEOCODING
  // Convert map coordinates into an address
  // ---------------------------------------

  const reverseGeocode = async (
    coordinates: Coordinates
  ): Promise<string> => {
    try {
      const url =
        "https://nominatim.openstreetmap.org/reverse?" +
        `format=jsonv2&lat=${coordinates.latitude}` +
        `&lon=${coordinates.longitude}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en",
          "User-Agent": "YAARI-Travel-App/1.0",
        },
      });

      if (!response.ok) {
        throw new Error("Unable to identify this location");
      }

      const data = await response.json();

      return (
        data.name ||
        data.display_name ||
        `${coordinates.latitude.toFixed(
          5
        )}, ${coordinates.longitude.toFixed(5)}`
      );
    } catch (error) {
      console.log("Reverse geocoding error:", error);

      return `${coordinates.latitude.toFixed(
        5
      )}, ${coordinates.longitude.toFixed(5)}`;
    }
  };

  // ---------------------------------------
  // SELECT A SEARCH RESULT
  // ---------------------------------------

  const selectSearchResult = (item: SearchResult) => {
    const coordinates: Coordinates = {
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    };

    const locationName = item.display_name;

    if (activeField === "from") {
      setFromLocation(locationName);
      setFromCoords(coordinates);
      setMapTarget("from");
    } else if (activeField === "to") {
      setToLocation(locationName);
      setToCoords(coordinates);
      setMapTarget("to");
    }

    setSuggestions([]);
    setActiveField(null);
    Keyboard.dismiss();

    mapRef.current?.animateToRegion(
      {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      700
    );
  };

  // ---------------------------------------
  // USE CURRENT LOCATION
  // ---------------------------------------

  const useCurrentLocation = async () => {
    try {
      setLocationLoading(true);

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert(
          "Location permission",
          "Please allow location access to use your current location."
        );
        return;
      }

      const position =
        await Location.getCurrentPositionAsync({
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

      mapRef.current?.animateToRegion(
        {
          ...coordinates,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        700
      );
    } catch (error) {
      console.error("Current location error:", error);

      Alert.alert(
        "Location unavailable",
        "Unable to detect your current location."
      );
    } finally {
      setLocationLoading(false);
    }
  };

  // ---------------------------------------
  // SELECT LOCATION BY TAPPING THE MAP
  // ---------------------------------------

  const selectMapLocation = async (
    coordinates: Coordinates
  ) => {
    try {
      const address = await reverseGeocode(coordinates);

      if (mapTarget === "from") {
        setFromLocation(address);
        setFromCoords(coordinates);
      } else {
        setToLocation(address);
        setToCoords(coordinates);
      }

      setActiveField(null);
      setSuggestions([]);
      Keyboard.dismiss();
    } catch (error) {
      console.log("Map selection error:", error);
    }
  };

  // ---------------------------------------
  // DRAG MARKER
  // ---------------------------------------

  const moveMarker = async (
    field: LocationField,
    coordinates: Coordinates
  ) => {
    const address = await reverseGeocode(coordinates);

    if (field === "from") {
      setFromCoords(coordinates);
      setFromLocation(address);
    } else {
      setToCoords(coordinates);
      setToLocation(address);
    }
  };

  // ---------------------------------------
  // DRAW ROAD ROUTE - OSRM
  // ---------------------------------------

  useEffect(() => {
    if (!fromCoords || !toCoords) {
      setRouteCoordinates([]);
      setRouteDistance(null);
      setRouteLoading(false);
      return;
    }

    const requestId = ++routeRequestId.current;

    const getRoute = async () => {
      try {
        setRouteLoading(true);

        const url =
          "https://router.project-osrm.org/route/v1/driving/" +
          `${fromCoords.longitude},${fromCoords.latitude};` +
          `${toCoords.longitude},${toCoords.latitude}` +
          "?overview=full&geometries=geojson";

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Route service unavailable");
        }

        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
          throw new Error("No route found");
        }

        if (requestId !== routeRequestId.current) return;

        const route = data.routes[0];

        const points: Coordinates[] =
          route.geometry.coordinates.map(
            (point: number[]) => ({
              longitude: point[0],
              latitude: point[1],
            })
          );

        setRouteCoordinates(points);
        setRouteDistance(route.distance);

        if (points.length > 0) {
          mapRef.current?.fitToCoordinates(
            [fromCoords, toCoords],
            {
              edgePadding: {
                top: 70,
                right: 55,
                bottom: 70,
                left: 55,
              },
              animated: true,
            }
          );
        }
      } catch (error) {
        console.error("Route error:", error);

        if (requestId === routeRequestId.current) {
          setRouteCoordinates([]);
          setRouteDistance(null);
            }
      } finally {
        if (requestId === routeRequestId.current) {
          setRouteLoading(false);
        }
      }
    };

    getRoute();

    return () => {
      routeRequestId.current++;
    };
  }, [fromCoords, toCoords]);

  // ---------------------------------------
  // FORMAT DISTANCE AND DURATION
  // ---------------------------------------

  const formatDistance = (meters: number) => {
    return meters >= 1000
      ? `${(meters / 1000).toFixed(1)} km`
      : `${Math.round(meters)} m`;
  };

  // ---------------------------------------
  // DATE PICKER
  // ---------------------------------------

  const handleDateChange = (event: any, date?: Date) => {
    const field = showDatePicker;
    setShowDatePicker(null);

    if (event?.type === "dismissed" || !date || !field) return;

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

  const handleTimeChange = (event: any, date?: Date) => {
    setShowTimePicker(false);
    if (event?.type === "dismissed" || !date) return;

    setSelectedTime(date);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    setDepartureTime(`${hours}:${minutes}`);
  };

  const tripDurationDays = (() => {
    if (!tripDate || !tripEndDate) return 0;
    const startDate = parseDate(tripDate);
    const endDate = parseDate(tripEndDate);
    const difference = Math.round(
      (endDate.getTime() - startDate.getTime()) / 86400000
    );
    return difference >= 0 ? difference + 1 : 0;
  })();

  // ---------------------------------------
  // CREATE TRIP
  // ---------------------------------------

  const handleCreateTrip = async () => {
    if (!fromLocation.trim() || !toLocation.trim()) {
      Alert.alert(
        "Locations required",
        "Please select both pickup and destination locations."
      );
      return;
    }

    if (!fromCoords || !toCoords) {
      Alert.alert(
        "Select locations",
        "Please select both locations from search suggestions or the map."
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
      Alert.alert(
        "Missing information",
        "Please enter seats and trip cost."
      );
      return;
    }

    const seats = Number(availableSeats);
    const cost = Number(tripCost);

    if (!Number.isInteger(seats) || seats <= 0) {
      Alert.alert(
        "Invalid seats",
        "Available seats must be a positive whole number."
      );
      return;
    }

    if (!Number.isFinite(cost) || cost < 0) {
      Alert.alert(
        "Invalid cost",
        "Enter a valid trip cost."
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
        Alert.alert(
          "Login required",
          "Please log in before creating a trip."
        );
        return;
      }

      await createTrip({
        creator_id: user.id,
        from_location: fromLocation.trim(),
        to_location: toLocation.trim(),
        trip_date: tripDate,
        trip_end_date: tripEndDate,
        departure_time: departureTime,
        available_seats: seats,
        trip_cost: cost,
        travel_type: travelType,
        description: description.trim(),
      });

      Alert.alert(
        "Trip created",
        "Your trip has been created successfully.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)"),
          },
        ]
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
  // LOCATION SEARCH INPUT
  // ---------------------------------------

  const renderLocationInput = (
    field: LocationField,
    label: string,
    value: string,
    placeholder: string,
    icon: string
  ) => {
    const isActive = activeField === field;

    return (
      <View className="mb-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-gray-700">
            {label}
          </Text>

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
            isActive
              ? "border-blue-500"
              : "border-gray-200"
          }`}
        >
          <Text className="mr-3 text-xl">
            {icon}
          </Text>

          <TextInput
            value={value}
            onChangeText={(text) => {
              if (field === "from") {
                setFromLocation(text);
                setFromCoords(null);
              } else {
                setToLocation(text);
                setToCoords(null);
              }

              setActiveField(field);
            }}
            onFocus={() => {
              setActiveField(field);
              setMapTarget(field);
            }}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            className="flex-1 py-4 text-base text-gray-900"
          />

          {value.length > 0 && (
            <Pressable
              onPress={() => {
                if (field === "from") {
                  setFromLocation("");
                  setFromCoords(null);
                } else {
                  setToLocation("");
                  setToCoords(null);
                }

                setSuggestions([]);
                setActiveField(field);
              }}
            >
              <Text className="px-2 text-lg text-gray-400">
                ×
              </Text>
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
            {suggestions.map((item, index) => (
              <Pressable
                key={item.place_id}
                onPress={() => selectSearchResult(item)}
                className="flex-row items-center border-b border-gray-100 px-4 py-4"
              >
                <Text className="mr-3 text-lg">
                  📍
                </Text>

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

        {/* HEADER */}

        <Text className="text-3xl font-bold text-gray-900">
          Create a Trip
        </Text>

        <Text className="mt-2 text-base text-gray-500">
          Where are you travelling today?
        </Text>

        {/* LOCATION SEARCH */}

        <View className="mt-7">
          {renderLocationInput(
            "from",
            "PICKUP LOCATION",
            fromLocation,
            "Search pickup location",
            "●"
          )}

          {renderLocationInput(
            "to",
            "DROP-OFF LOCATION",
            toLocation,
            "Search destination",
            "●"
          )}

          <Pressable
            onPress={() => {
              const oldFrom = fromLocation;
              const oldFromCoords = fromCoords;

              setFromLocation(toLocation);
              setFromCoords(toCoords);

              setToLocation(oldFrom);
              setToCoords(oldFromCoords);

              setSuggestions([]);
              setActiveField(null);
            }}
            className="self-end"
          >
            <Text className="font-semibold text-blue-600">
              ⇅ Swap locations
            </Text>
          </Pressable>
        </View>

        {/* MAP */}

        <View className="mt-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">
              Select your route
            </Text>

            <Text className="text-xs text-gray-500">
              Tap map to place pin
            </Text>
          </View>

          {/* Select which marker to move */}

          <View className="mb-3 flex-row gap-2">
            <Pressable
              onPress={() => setMapTarget("from")}
              className={`flex-1 rounded-xl border px-3 py-3 ${
                mapTarget === "from"
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  mapTarget === "from"
                    ? "text-blue-700"
                    : "text-gray-600"
                }`}
              >
                ● Pickup pin
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMapTarget("to")}
              className={`flex-1 rounded-xl border px-3 py-3 ${
                mapTarget === "to"
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  mapTarget === "to"
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                ● Destination pin
              </Text>
            </Pressable>
          </View>

          <View className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
            <MapView
              ref={mapRef}
              style={{
                width: "100%",
                height: 320,
              }}
              initialRegion={INITIAL_REGION}
              mapType="standard"
              onPress={(event) => {
                selectMapLocation(
                  event.nativeEvent.coordinate
                );
              }}
              showsCompass
              showsScale
              toolbarEnabled
            >
              {/* Pickup marker */}

              {fromCoords && (
                <Marker
                  coordinate={{
                    latitude: fromCoords.latitude,
                    longitude: fromCoords.longitude,
                  }}
                  title="Pickup location"
                  description={fromLocation}
                  pinColor="green"
                  draggable
                  onDragEnd={(event) =>
                    moveMarker(
                      "from",
                      event.nativeEvent.coordinate
                    )
                  }
                />
              )}

              {/* Destination marker */}

              {toCoords && (
                <Marker
                  coordinate={{
                    latitude: toCoords.latitude,
                    longitude: toCoords.longitude,
                  }}
                  title="Destination"
                  description={toLocation}
                  pinColor="red"
                  draggable
                  onDragEnd={(event) =>
                    moveMarker(
                      "to",
                      event.nativeEvent.coordinate
                    )
                  }
                />
              )}

              {/* Road route */}

              {routeCoordinates.length > 0 && (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="#2563EB"
                  strokeWidth={5}
                />
              )}
            </MapView>

            {/* MAP FOOTER */}

            <View className="bg-white px-4 py-3">
              <Text className="text-xs text-gray-500">
                Currently moving:
              </Text>

              <Text className="font-semibold text-gray-800">
                {mapTarget === "from"
                  ? "Pickup location"
                  : "Destination"}
              </Text>
            </View>
          </View>

          {/* ROUTE INFORMATION */}

          {routeLoading && (
            <View className="mt-4 flex-row items-center">
              <ActivityIndicator color="#2563EB" />
              <Text className="ml-2 text-sm text-gray-500">
                Calculating your route...
              </Text>
            </View>
          )}

          {routeDistance !== null && (
            <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="text-xs text-gray-500">ROUTE DISTANCE</Text>
              <Text className="mt-1 text-xl font-bold text-gray-900">
                {formatDistance(routeDistance)}
              </Text>
            </View>
          )}
        </View>

        {/* TRIP START DATE */}
        <View className="mt-7">
          <Text className="mb-2 text-sm font-bold text-gray-700">
            TRIP START DATE *
          </Text>
          <Pressable
            onPress={() => setShowDatePicker("start")}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4"
          >
            <Text className="text-base text-gray-800">
              {formatDate(tripDate)}
            </Text>
          </Pressable>
        </View>

        {/* TRIP END DATE */}
        <View className="mt-5">
          <Text className="mb-2 text-sm font-bold text-gray-700">
            TRIP END DATE *
          </Text>
          <Pressable
            onPress={() => setShowDatePicker("end")}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4"
          >
            <Text className="text-base text-gray-800">
              {formatDate(tripEndDate)}
            </Text>
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
            onChange={handleDateChange}
          />
        )}

        {/* INCLUSIVE TRIP DURATION */}
        <View className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <Text className="text-sm font-semibold text-blue-800">
            TRIP DURATION
          </Text>
          <Text className="mt-1 text-xl font-bold text-blue-900">
            {tripDurationDays} {tripDurationDays === 1 ? "day" : "days"}
          </Text>
          <Text className="mt-1 text-xs text-blue-700">
            Start and end dates are both counted.
          </Text>
        </View>

        {/* SELECTABLE DEPARTURE TIME */}
        <View className="mt-5">
          <Text className="mb-2 text-sm font-bold text-gray-700">
            DEPARTURE TIME *
          </Text>
          <Pressable
            onPress={() => setShowTimePicker(true)}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4"
          >
            <Text className={`text-base ${departureTime ? "text-gray-900" : "text-gray-400"}`}>
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
              onChange={handleTimeChange}
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
          <Text className="mb-3 text-sm font-bold text-gray-700">
            TRAVEL TYPE
          </Text>

          <View className="flex-row gap-3">
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
                    travelType === type
                      ? "text-white"
                      : "text-gray-700"
                  }`}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* DESCRIPTION */}

        <View className="mt-5">
          <Text className="mb-2 text-sm font-bold text-gray-700">
            DESCRIPTION
          </Text>

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

        {/* CREATE BUTTON */}

        <Pressable
          onPress={handleCreateTrip}
          disabled={loading}
          className={`mt-8 items-center rounded-2xl px-6 py-4 ${
            loading ? "bg-blue-300" : "bg-blue-600"
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
            <Text className="text-base font-bold text-white">
              Create Trip
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

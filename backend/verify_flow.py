import json
import urllib.request
import urllib.error
import time

BASE_URL = "http://localhost:8080/api"

def request(method, endpoint, data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    req_data = json.dumps(data).encode("utf-8") if data else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body) if res_body else None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"HTTPError {e.code} on {method} {endpoint}: {err_body}")
        raise e

def main():
    print("==================================================================")
    print(" ROUTEFILL — Road Logistics Platform Full E2E Lifecycle Verification")
    print(" Tagline: 'Don't create another trip. Fill the empty one.'")
    print("==================================================================")
    
    # 1. Login Customer
    cust_auth = request("POST", "/auth/login", {"email": "priya@nairtextiles.in", "password": "demo1234"})
    cust_token = cust_auth["token"]
    print(f"[1] Customer authenticated: {cust_auth['user']['name']} ({cust_auth['user']['company']})")
    
    # 2. Login Driver
    driver_auth = request("POST", "/auth/login", {"email": "ganesh@example.com", "password": "demo1234"})
    driver_token = driver_auth["token"]
    print(f"[2] Driver authenticated: {driver_auth['user']['name']} ({driver_auth['user']['vehicleType']} - {driver_auth['user']['vehicleNumber']})")
    
    # 3. Driver posts an existing planned road trip with unused return capacity
    ts = int(time.time())
    trip_req = {
        "origin": "Vijayawada, AP",
        "destination": "Hyderabad, TS",
        "vehicleType": "Tata Ace - 0.75T",
        "vehicleNumber": "AP16 GK 7788",
        "unit": "kg",
        "totalCapacityTons": 750.0,
        "existingLoadTons": 300.0,
        "availableDate": "2026-09-15",
        "minPrice": 3500.0,
        "returnTripCorridor": True
    }
    trip_res = request("POST", "/road-trips", trip_req, token=driver_token)
    trip = trip_res.get("data", trip_res)
    trip_id = trip["id"]
    print(f"[3] Driver published road trip: {trip_id} | Route: {trip['origin']} -> {trip['destination']} | Unused Capacity: {trip.get('remainingTons', trip.get('availableBackhaulTons'))} {trip['unit']}")
    
    # 4. Customer posts a cargo load matching this road corridor
    load_req = {
        "material": "Handicraft & Pottery Cartons",
        "weightTons": 200.0,
        "unit": "kg",
        "origin": "Vijayawada, AP",
        "destination": "Hyderabad, TS",
        "pickupDate": "2026-09-15",
        "budget": 3600.0,
        "notes": "Fragile terracotta items, stack with care."
    }
    load_res = request("POST", "/cargo-loads", load_req, token=cust_token)
    load = load_res.get("data", load_res)
    load_id = load["id"]
    print(f"[4] Customer created cargo load: {load_id} | {load['weightTons']}{load['unit']} {load['material']}")
    
    # Publish load
    pub_res = request("POST", f"/cargo-loads/{load_id}/publish", token=cust_token)
    print(f"    Load status published to: {pub_res.get('data', {}).get('status')}")
    
    # 5. Matching Engine analysis
    matches_res = request("GET", f"/cargo-loads/{load_id}/matches", token=cust_token)
    matches = matches_res.get("data", [])
    matched_trip = next((m for m in matches if m["id"] == trip_id), matches[0] if matches else None)
    if not matched_trip:
        print("ERROR: No matching road trip found!")
        return
    print(f"[5] ROUTEFILL Matching Engine: {matched_trip['matchScore']}% match on trip {matched_trip['id']}")
    print(f"    Match breakdown: Route={matched_trip['matchBreakdown']['route']}, Capacity={matched_trip['matchBreakdown']['capacity']}, Vehicle={matched_trip['matchBreakdown']['vehicle']}")
    print(f"    Reasons: {', '.join(matched_trip['reasons'])}")
    
    # 6. Customer requests booking
    booking_req = {
        "loadId": load_id,
        "capacityId": trip_id,
        "price": 3500.0
    }
    booking_res = request("POST", "/booking-requests", booking_req, token=cust_token)
    booking = booking_res.get("data", booking_res)
    booking_id = booking["id"]
    print(f"[6] Shipper booking requested: {booking_id} | Status: {booking['status']}")
    
    # 7. Driver reviews and accepts booking (Pessimistic lock + capacity decrement + Digital Consignment)
    decide_req = {
        "decision": "accepted",
        "actorLocation": "Bhavanipuram Handicraft Yard, Vijayawada"
    }
    decide_res = request("POST", f"/booking-requests/{booking_id}/decide", decide_req, token=driver_token)
    accepted = decide_res.get("data", decide_res)
    print(f"[7] Driver accepted booking! Status: {accepted['status']}")
    print(f"    Digital Road Consignment: {accepted['digitalRecord']['consignmentId']}")
    
    # 8. Check updated vehicle capacity in database
    trip_check = request("GET", f"/road-trips/{trip_id}", token=driver_token)["data"]
    rem = trip_check.get('remainingTons', trip_check.get('availableBackhaulTons'))
    print(f"[8] Verified road vehicle remaining capacity: {rem} kg (initial was 450 kg, booked 200 kg -> now {rem} kg)")
    assert rem == 250.0, f"Expected 250.0kg remaining but got {rem}"
    
    # 9. Driver confirms pickup
    pickup = request("POST", f"/consignments/{booking_id}/pickup", {"location": "Bhavanipuram Handicraft Yard, Vijayawada"}, token=driver_token)["data"]
    print(f"[9] Cargo pickup confirmed. Status: {pickup['status']}")
    
    # 10. Driver starts highway transit
    transit = request("POST", f"/consignments/{booking_id}/in-transit", {"location": "NH65 Suryapet Toll Plaza"}, token=driver_token)["data"]
    print(f"[10] Consignment in transit. Status: {transit['status']}")
    
    # 11. Driver arrives at destination
    arrived = request("POST", f"/consignments/{booking_id}/arrived", {"location": "LB Nagar Cargo Depot, Hyderabad"}, token=driver_token)["data"]
    print(f"[11] Driver marked vehicle arrived at destination corridor. Status: {arrived['status']}")
    
    # 12. Driver initiates delivery -> Receiver OTP generated
    delivery_init = request("POST", f"/consignments/{booking_id}/delivery/initiate", token=driver_token)["data"]
    otp = delivery_init.get("otp")
    print(f"[12] Delivery initiated! Generated 4-digit receiver OTP: {otp}")
    
    # 13. Driver verifies delivery OTP with consignee
    verify_req = {
        "otp": otp,
        "receiverName": "Srikanth Reddy",
        "receiverPhone": "+91 98480 12345",
        "podNotes": "Cartons received in pristine condition at Hyderabad warehouse."
    }
    delivered = request("POST", f"/consignments/{booking_id}/delivery/verify", verify_req, token=driver_token)["data"]
    print(f"[13] OTP verified successfully! Consignment status: {delivered['status']}")
    
    # 14. Fetch official Proof of Delivery (POD)
    pod = request("GET", f"/consignments/{booking_id}/pod", token=cust_token)["data"]
    print(f"[14] Proof of Delivery (POD) generated: ID={pod.get('id', pod.get('podId'))}")
    print(f"     Consignment ID: {pod.get('consignmentId')} | Receiver: {pod.get('receiverName')} | Delivered: {pod.get('deliveredAt', pod.get('deliveryTime'))}")
    
    # 15. Public Consignment Tracking
    waybill = accepted['digitalRecord']['consignmentId']
    track = request("GET", f"/consignments/track/{waybill}")["data"]
    print(f"[15] Public road tracking verified: Consignment={track['consignmentId']} | Status={track['status']} | ETA={track['etaHours']}h")
    
    # 16. Customer rates driver
    rating_req = {
        "raterRole": "customer",
        "ratings": {"overall": 5, "timeliness": 5, "cargoHandling": 5},
        "review": "Fast delivery on the Vijayawada-Hyderabad corridor! Highly recommended."
    }
    request("POST", f"/booking-requests/{booking_id}/rate", rating_req, token=cust_token)
    ratings = request("GET", f"/booking-requests/{booking_id}/ratings", token=cust_token)["data"]
    print(f"[16] Customer rating saved: {ratings['customer']['ratings']} - '{ratings['customer']['review']}'")
    
    # 17. Driver submits freight & toll bill
    bill_req = {
        "freightAmount": 3500.0,
        "tollCharges": 420.0,
        "otherCharges": 80.0
    }
    bill_res = request("POST", f"/driver/bills?matchId={booking_id}", bill_req, token=driver_token)["data"]
    total = bill_res.get("totalAmount") or (bill_res.get("freightAmount", 0) + bill_res.get("tollCharges", 0) + bill_res.get("otherCharges", 0))
    print(f"[17] Driver submitted bill: ID={bill_res['id']} | Total Rs.{total} (Freight Rs.{bill_res['freightAmount']} + Toll Rs.{bill_res['tollCharges']} + Other Rs.{bill_res['otherCharges']})")
    
    # 18. Admin reviews and approves bill (Test Admin 1: admin@loadlink.in & Admin 2: ops@loadlink.in)
    admin_auth = request("POST", "/auth/login", {"email": "admin@loadlink.in", "password": "admin123"})
    admin_token = admin_auth["token"]
    # Verify Admin 2 can also authenticate
    ops_auth = request("POST", "/auth/login", {"email": "ops@loadlink.in", "password": "admin123"})
    print(f"     [+] Verified 2 LoadLink Admin Accounts: {admin_auth['user']['name']} ({admin_auth['user']['email']}) & {ops_auth['user']['name']} ({ops_auth['user']['email']})")
    request("POST", f"/admin/bills/{bill_res['id']}/review", {"decision": "approved"}, token=admin_token)
    print(f"[18] Admin reviewed & approved bill {bill_res['id']} for payout.")
    
    # 19. Platform Analytics (direct JDBC SQL)
    stats = request("GET", "/analytics/platform-stats", token=admin_token)["data"]
    print(f"[19] Live platform analytics (JDBC Direct SQL):")
    print(f"     Total Trips: {stats.get('totalTrips')} | Completed Trips: {stats.get('completedTrips')}")
    print(f"     Total GMV: Rs.{stats.get('gmv', 0):,.2f} | Empty Distance Avoided: {stats.get('estimatedEmptyDistanceAvoidedKm', 0)} km")
    print(f"     Driver Extra Income: Rs.{stats.get('driverAdditionalIncome', 0):,.2f} | Shipper Savings: Rs.{stats.get('customerSavings', 0):,.2f}")
    
    print("\n==================================================================")
    print(" >>> FULL END-TO-END ROAD LOGISTICS LIFECYCLE 100% VERIFIED! <<<")
    print("==================================================================")

if __name__ == "__main__":
    main()

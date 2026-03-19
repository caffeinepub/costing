import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Map "mo:core/Map";



actor {
  // Types
  type GsmRange = {
    id : Nat;
    name : Text;
    minGsm : Float;
    maxGsm : Float;
  };

  type Grade = {
    id : Nat;
    name : Text;
    description : Text;
  };

  type Layer = {
    id : Nat;
    name : Text;
    description : Text;
  };

  type RM = {
    id : Nat;
    name : Text;
    unitCost : Float;
    unit : Text;
  };

  type CostingItem = {
    rmId : Nat;
    quantity : Float;
  };

  type CostingRecord = {
    id : Nat;
    name : Text;
    gradeId : Nat;
    layerId : Nat;
    gsmRangeId : Nat;
    width : Float;
    length : Float;
    quantity : Nat;
    items : [CostingItem];
    totalCost : Float;
    createdAt : Int;
  };

  type CalculatedItem = {
    rmId : Nat;
    baseQty : Float;
    calculatedQty : Float;
  };

  type ProductionEntry = {
    id : Nat;
    costingRecordId : Nat;
    productionQtyMT : Float;
    calculatedItems : [CalculatedItem];
    createdAt : Int;
  };

  // Stable storage arrays for persistence across upgrades
  stable var stableNextId : Nat = 1;
  stable var stableGsmRanges : [(Nat, GsmRange)] = [];
  stable var stableGrades : [(Nat, Grade)] = [];
  stable var stableLayers : [(Nat, Layer)] = [];
  stable var stableRMs : [(Nat, RM)] = [];
  stable var stableCostingRecords : [(Nat, CostingRecord)] = [];
  stable var stableProductionEntries : [(Nat, ProductionEntry)] = [];

  // In-memory maps
  var nextId = stableNextId;
  let gsmRanges = Map.empty<Nat, GsmRange>();
  let grades = Map.empty<Nat, Grade>();
  let layers = Map.empty<Nat, Layer>();
  let rms = Map.empty<Nat, RM>();
  let costingRecords = Map.empty<Nat, CostingRecord>();
  let productionEntries = Map.empty<Nat, ProductionEntry>();

  // Helper
  func getNextId() : Nat {
    let id = nextId;
    nextId += 1;
    stableNextId := nextId;
    id;
  };

  func seedInitialData() {
    // Grade: Deluxe
    let gId = getNextId();
    grades.add(gId, { id = gId; name = "Deluxe"; description = "" });

    // GSM Range: 230-249
    let gsmId = getNextId();
    gsmRanges.add(gsmId, { id = gsmId; name = "230-249"; minGsm = 230.0; maxGsm = 249.0 });

    // Layers: TL, PL, FL, BL
    let tlId = getNextId();
    layers.add(tlId, { id = tlId; name = "TL"; description = "Top Layer" });
    let plId = getNextId();
    layers.add(plId, { id = plId; name = "PL"; description = "Print Layer" });
    let flId = getNextId();
    layers.add(flId, { id = flId; name = "FL"; description = "Flute Layer" });
    let blId = getNextId();
    layers.add(blId, { id = blId; name = "BL"; description = "Back Layer" });

    // RMs from reference data
    let rm1 = getNextId();
    rms.add(rm1, { id = rm1; name = "Cup Stock"; unitCost = 0.0; unit = "kg" });
    let rm2 = getNextId();
    rms.add(rm2, { id = rm2; name = "Note Book"; unitCost = 0.0; unit = "kg" });
    let rm3 = getNextId();
    rms.add(rm3, { id = rm3; name = "No.1 Cutting"; unitCost = 0.0; unit = "kg" });
    let rm4 = getNextId();
    rms.add(rm4, { id = rm4; name = "White Reco"; unitCost = 0.0; unit = "kg" });
    let rm5 = getNextId();
    rms.add(rm5, { id = rm5; name = "Scan Board"; unitCost = 0.0; unit = "kg" });
    let rm6 = getNextId();
    rms.add(rm6, { id = rm6; name = "BBC"; unitCost = 0.0; unit = "kg" });
    let rm7 = getNextId();
    rms.add(rm7, { id = rm7; name = "ONP (6)"; unitCost = 0.0; unit = "kg" });
    let rm8 = getNextId();
    rms.add(rm8, { id = rm8; name = "Broke"; unitCost = 0.0; unit = "kg" });
    let rm9 = getNextId();
    rms.add(rm9, { id = rm9; name = "ONP Local"; unitCost = 0.0; unit = "kg" });
  };

  // Restore from stable storage on init
  do {
    for ((k, v) in stableGsmRanges.vals()) { gsmRanges.add(k, v) };
    for ((k, v) in stableGrades.vals()) { grades.add(k, v) };
    for ((k, v) in stableLayers.vals()) { layers.add(k, v) };
    for ((k, v) in stableRMs.vals()) { rms.add(k, v) };
    for ((k, v) in stableCostingRecords.vals()) { costingRecords.add(k, v) };
    for ((k, v) in stableProductionEntries.vals()) { productionEntries.add(k, v) };

    // Seed only if brand new canister
    if (grades.isEmpty()) {
      seedInitialData();
    };
  };

  system func preupgrade() {
    stableNextId := nextId;
    stableGsmRanges := gsmRanges.entries().toArray();
    stableGrades := grades.entries().toArray();
    stableLayers := layers.entries().toArray();
    stableRMs := rms.entries().toArray();
    stableCostingRecords := costingRecords.entries().toArray();
    stableProductionEntries := productionEntries.entries().toArray();
  };

  system func postupgrade() {
    // Data already restored in the `do` block above on actor init
  };

  // GSM Range CRUD
  public shared ({ caller }) func createGsmRange(name : Text, minGsm : Float, maxGsm : Float) : async Nat {
    let id = getNextId();
    let gsmRange : GsmRange = { id; name; minGsm; maxGsm };
    gsmRanges.add(id, gsmRange);
    id;
  };

  public query ({ caller }) func getGsmRange(id : Nat) : async ?GsmRange {
    gsmRanges.get(id);
  };

  public query ({ caller }) func listGsmRanges() : async [GsmRange] {
    gsmRanges.values().toArray();
  };

  public shared ({ caller }) func updateGsmRange(id : Nat, name : Text, minGsm : Float, maxGsm : Float) : async Bool {
    switch (gsmRanges.get(id)) {
      case (?_) {
        gsmRanges.add(id, { id; name; minGsm; maxGsm });
        true;
      };
      case (null) { false };
    };
  };

  public shared ({ caller }) func deleteGsmRange(id : Nat) : async Bool {
    if (gsmRanges.containsKey(id)) {
      gsmRanges.remove(id);
      true;
    } else { false };
  };

  // Grade CRUD
  public shared ({ caller }) func createGrade(name : Text, description : Text) : async Nat {
    let id = getNextId();
    grades.add(id, { id; name; description });
    id;
  };

  public query ({ caller }) func getGrade(id : Nat) : async ?Grade {
    grades.get(id);
  };

  public query ({ caller }) func listGrades() : async [Grade] {
    grades.values().toArray();
  };

  public shared ({ caller }) func updateGrade(id : Nat, name : Text, description : Text) : async Bool {
    switch (grades.get(id)) {
      case (?_) {
        grades.add(id, { id; name; description });
        true;
      };
      case (null) { false };
    };
  };

  public shared ({ caller }) func deleteGrade(id : Nat) : async Bool {
    if (grades.containsKey(id)) {
      grades.remove(id);
      true;
    } else { false };
  };

  // Layer CRUD
  public shared ({ caller }) func createLayer(name : Text, description : Text) : async Nat {
    let id = getNextId();
    layers.add(id, { id; name; description });
    id;
  };

  public query ({ caller }) func getLayer(id : Nat) : async ?Layer {
    layers.get(id);
  };

  public query ({ caller }) func listLayers() : async [Layer] {
    layers.values().toArray();
  };

  public shared ({ caller }) func updateLayer(id : Nat, name : Text, description : Text) : async Bool {
    switch (layers.get(id)) {
      case (?_) {
        layers.add(id, { id; name; description });
        true;
      };
      case (null) { false };
    };
  };

  public shared ({ caller }) func deleteLayer(id : Nat) : async Bool {
    if (layers.containsKey(id)) {
      layers.remove(id);
      true;
    } else { false };
  };

  // RM CRUD
  public shared ({ caller }) func createRM(name : Text, unitCost : Float, unit : Text) : async Nat {
    let id = getNextId();
    rms.add(id, { id; name; unitCost; unit });
    id;
  };

  public query ({ caller }) func getRM(id : Nat) : async ?RM {
    rms.get(id);
  };

  public query ({ caller }) func listRMs() : async [RM] {
    rms.values().toArray();
  };

  public shared ({ caller }) func updateRM(id : Nat, name : Text, unitCost : Float, unit : Text) : async Bool {
    switch (rms.get(id)) {
      case (?_) {
        rms.add(id, { id; name; unitCost; unit });
        true;
      };
      case (null) { false };
    };
  };

  public shared ({ caller }) func deleteRM(id : Nat) : async Bool {
    if (rms.containsKey(id)) {
      rms.remove(id);
      true;
    } else { false };
  };

  // Costing Record
  public shared ({ caller }) func createCostingRecord(
    name : Text,
    gradeId : Nat,
    layerId : Nat,
    gsmRangeId : Nat,
    width : Float,
    length : Float,
    quantity : Nat,
    items : [CostingItem]
  ) : async Int {
    var totalCost = 0.0;
    for (item in items.vals()) {
      switch (rms.get(item.rmId)) {
        case (?rm) { totalCost += rm.unitCost * item.quantity };
        case (null) {};
      };
    };

    let id = getNextId();
    let costingRecord : CostingRecord = {
      id;
      name;
      gradeId;
      layerId;
      gsmRangeId;
      width;
      length;
      quantity;
      items;
      totalCost;
      createdAt = Time.now();
    };
    costingRecords.add(id, costingRecord);
    id.toInt();
  };

  public query ({ caller }) func getCostingRecord(id : Nat) : async ?CostingRecord {
    costingRecords.get(id);
  };

  public query ({ caller }) func listCostingRecords() : async [CostingRecord] {
    costingRecords.values().toArray();
  };

  public shared ({ caller }) func deleteCostingRecord(id : Nat) : async Bool {
    if (costingRecords.containsKey(id)) {
      costingRecords.remove(id);
      true;
    } else { false };
  };

  // Production Entry
  public shared ({ caller }) func createProductionEntry(costingRecordId : Nat, productionQtyMT : Float) : async Int {
    switch (costingRecords.get(costingRecordId)) {
      case (?costingRecord) {
        let calculatedItems = costingRecord.items.map(
          func(item) : CalculatedItem {
            {
              rmId = item.rmId;
              baseQty = item.quantity;
              calculatedQty = item.quantity * productionQtyMT;
            };
          }
        );

        let id = getNextId();
        let productionEntry : ProductionEntry = {
          id;
          costingRecordId;
          productionQtyMT;
          calculatedItems;
          createdAt = Time.now();
        };
        productionEntries.add(id, productionEntry);
        id.toInt();
      };
      case (null) {
        -1;
      };
    };
  };

  public query ({ caller }) func listProductionEntries() : async [ProductionEntry] {
    productionEntries.values().toArray();
  };

  public shared ({ caller }) func deleteProductionEntry(id : Nat) : async Bool {
    if (productionEntries.containsKey(id)) {
      productionEntries.remove(id);
      true;
    } else { false };
  };
};

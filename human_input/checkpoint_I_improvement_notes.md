# ✅ Checkpoint I – Notes for Improvement

## 🔧 Structural Improvements

1. **Entity Definition**
   - Currently `Entity` is only a JSDoc typedef.  
   - Options:  
     - Keep as a `type Entity = number` alias (simple, matches spec).  
     - Or create a lightweight class if lifecycle tracking is desired (`createdAt`, `destroyed` flag, etc.).

2. **Module Exports**
   - Remove stray `module.exports = {}` from `Entity` file — it overwrites actual exports.  
   - Ensure each primitive (`EntityManager`, `ComponentManager`, `ComponentType`) has clean, isolated exports.

3. **ComponentType Identity**
   - Identity is object-based (`Map<compType, component>`).  
   - Consider mapping by `name` instead, so two `ComponentType('position')` instances don’t diverge.  

---

## 🧪 Testing Improvements

1. **Negative Cases**
   - Add tests for:  
     - Removing a non-existent entity.  
     - Adding duplicate components to the same entity (decide: overwrite or throw).  
     - Creating two `ComponentType` instances with the same name (should throw).  

2. **Schema Validation**
   - `ComponentType` takes a `schema` param but it isn’t enforced.  
   - Add minimal validation (e.g., key presence) and tests for schema mismatch.

3. **Lifecycle Consistency**
   - Verify `removeEntity` clears *all* its components.  
   - Ensure `allEntities()` returns a safe copy (mutating the result should not affect internal state).  

---

## 🏗️ Implementation Enhancements

1. **Component Data Handling**
   - `getComponents(entity)` returns a copy (good).  
   - `getComponent(entity, type)` returns original reference — decide if cloning is needed for immutability.

2. **Error Semantics**
   - Clarify behavior for invalid operations (`removeComponent` on non-existent entity, etc.):  
     - Silent no-op (current)  
     - Or throw error (explicit).

3. **Naming Consistency**
   - `schema` field in `ComponentType` could be renamed → `definition` or `shape` if runtime validation isn’t done.  

4. **Performance Considerations**
   - `getEntitiesWithComponent` iterates over all entities each call.  
   - For scalability, maintain an index (`Map<ComponentType, Set<Entity>>`).

---

## 📖 Documentation & Spec Alignment

- Tie implementation/tests directly to the spec:  
  - **Entities have no behavior** → confirm Entity is just an ID.  
  - **One component per ComponentType per entity** → add overwrite/duplicate test.  
  - **ComponentType uniqueness** → already enforced, but document rationale.  

---

### 🎯 Summary
- Clean up **exports**.  
- Strengthen **Entity** definition.  
- Add **edge case tests**.  
- Decide on **overwrite/error semantics**.  
- Optionally add **schema validation** and **indexing** for scale.  

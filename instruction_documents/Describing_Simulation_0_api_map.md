# API Map

For readability, this is an enumeration of all the available endpoints of a sim-eval server, followed by reiteration of their functions covered in Checkpoint IX.

```
(1)   GET    /                                      
(2)   GET    /information/Describing_Simulation.md   
(3)   GET    /information/api.md                    
(4)   POST   /simulation/start                      
(5)   POST   /simulation/pause                      
(6)   POST   /simulation/stop                       
(7)   POST   /simulation/system                     
(8)   DELETE /simulation/system/:id                 
(9)   POST   /simulation/component                  
(10)  DELETE /simulation/component/:id              
(11)  GET    /simulation/stream                     
(12)  POST   /evaluation/frame                      
(13)  POST   /evaluation/system                     
(14)  DELETE /evaluation/system/:id                 
(15)  POST   /evaluation/component                  
(16)  DELETE /evaluation/component/:id              
(17)  GET    /evaluation/stream                     
(18)  GET    /codebase/tree                         
(19)  GET    /codebase/file?path=<filepath>         
(20)  POST   /codebase/plugin                       
(21)  GET    /health                                
(22)  GET    /status  
```
### Root Domain

(1) The root domain returns a node with maximal discoverability, being semantically dense but minimal in redundancy. From the information returned here, we can navigate through the universe of knowledge around sim-eval. Concretely it reveals the existence of a path for informational files.

### Informational

The information branch of endpoints contains the theory of sim-eval and the surface of sim-eval management.

#### Source Spec

(2) The source spec is an exhaustive explanation of the theory of sim-eval.

#### Management Surface

(3) The api enumerates all the endpoints (at the top of API Map section) and provides an explanation for their usage

### Simulation

The simulation branch of endpoints governs the execution and control of the simulation player. Each route manipulates the runtime environment or its constituent systems and components.

#### Start

(4) The start command initiates the simulation loop, beginning cyclical evaluation of all active systems in sequence until paused or stopped.

#### Pause

(5) The pause command suspends the simulation at its current tick, preserving all component and entity states for later continuation.

#### Stop

(6) The stop command halts the simulation and clears the environment, returning the engine to an initialized state without active entities or systems.

#### System Injection

(7) The system injection route allows dynamic addition of systems during runtime, extending environment behavior without service restart.

#### System Ejection

(8) The system ejection route removes a system from the execution sequence, immediately ceasing its participation in environment updates.

#### Component Injection

(9) The component injection route attaches new component definitions to entities, enabling new signals or state representations.

#### Component Ejection

(10) The component ejection route removes component definitions from entities, retracting signals from the environment.

#### Stream

(11) The simulation stream emits serialized frames of the environment at each tick. This endpoint provides continuous visibility into the simulation’s internal state and is used for real-time analysis or playback.

### Codebase

The codebase branch of endpoints exposes introspection of the repository and runtime plugin management, allowing users and agents to read, modify, and extend the source environment.

#### Directory Tree

(18) The tree route returns the full directory structure of the project repository, allowing traversal through source files and plugin directories.

#### File Retrieval

(19) The file retrieval route returns the raw text of a source file given its path, enabling inspection of system and component implementations.

#### Plugin Upload

(20) The plugin upload route receives source code for new systems, components, or operations and places them in the appropriate plugin directory. Acknowledgement confirms successful placement and registration.

### System

The system endpoints expose health and state information of the sim-eval service.

#### Health

(21) The health route returns the operational state of the service, including version, uptime, and readiness to handle requests.

#### Status

(22) The status route reports the runtime status of both simulation and evaluation players, indicating whether they are running, paused, or idle.


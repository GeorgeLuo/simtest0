# Describing Simulation

Suppose we were to define an agent responsible for solving hypotheticals with quantitative approaches. The general strategy would be to model the relevant systems, determine the values to set in the systems, and compute the result.

This paper seeks to define an approach to build such simulations from natural language prompts, from validation to intent extraction, to codification. We define a specific methodology of building simulations for a specific problem space. The intent is not to address the universe of open-ended questions, but hopefully will address some problems worth solving.

## Summary of Assumptions

Moving forward, we will assume all problems within scope elicit **comparative temporality**, and **endogeneity** in their simulation, and have some quality of **relational conditionality**.

All problems we are willing to address compare states of environments distinct in time segments, and all parts that affect change and the effects of change as distinct bodies must exist within the environment.

To this end, we will view the input statement as mappable to a form that is intent-complete and compatible for computational simulation.

# Describing Hypotheticals

In a natural speech, hypotheticals are patterned as (**A**):

“What happens when X happens?”

This section will enumerate classifications of hypothetical statements to translate natural speech statements into actionable specs. We will progressively be developing refinements from the above, preserving and concretizing the intent.

## Endogenous or Exogenous

Naively mapping the explicit and implicit quantities in a hypothetical:

- X: an observable phenomenon in the environment

- E: the environment as a system

- Y: the change in the environment outside of the phenomenon

Another approach to framing hypotheticals might be (**B**):

“How does E change as X within the environment changes”

The difference here is **B** frames the solution as endogenous. X is part of the environment and answering the hypothetical includes describing the changes to X as the changing X ripples throughout the environment. 

In **A**, the interpretation of how to solve the prompt is exogenous, the recipient of the prompt approaches the solution with cause-and-effect framing (**A2**):

“Suppose X moves by ΔX and then remains fixed. What happens to the rest of E?”

The reason why this matters is the prompt is sent expecting an endogenous answer, but the prompt logically *may not*, while being the most natural formulation in natural speech. To simplify, we will proceed assuming the solution is always endogenous.

## Boundaries

X informs the time boundary of observation, we are observing the environment as long as X is occurring.

 The systems if bound with time (**C**):

“What was the behavior of E during T?”

- T: derived from the lifetime of the phenomenon X, a point in time distanced from T~0~ the beginning of the observation

Note the exemption of X from the prompt. X is only as useful as a proxy of time if the solution is endogenous. X is now a part of the environment.

Retaining X (**C2**):

“Given X~0~ at T~0~ what is the behavior of E as we approach X~T~?”

Implied here is a set of conditions to be fulfilled in order to conclude observation (**D**):

“What is the behavior of E until C is fulfilled?”

- C: a set of conditions described with signals of the environment

This distinction is useful when X~T~ is ambiguous in cases where a number of events are the condition for bounding the hypothetical. Radically, we’ve included T as part of the environment.

### Temporality

Let’s reword form A slightly (**A2**):

“What happens *while* X happens?”

The cascading change to form D (**D2**):

“What is the behavior of E *while C is unfilled*?”

The slight difference in logical space is A2 and D2 may not have a definitive end point. Practically, the intent is the same. The intent is always to compare the environment through the period when C is unfulfilled, and then through when the period has ended.

This introduces another point on temporality; if the intent of hypotheticals is to note contrast in the environment due to a phenomenon, then the environment should be initialized with a beginning condition where the phenomenon has not yet occurred.

#### Static Problems

Here we should pause to say temporality is not required for all simulations.

"What happens to humidity as it rains?"

This lies in the static problem space, it is possible to model the relationship in a sweep of values. Such evaluations are piecewise components of temporal problems: when “*x is less than X*~0~*”  *allows for the static component to exist, but in simulation the question eventually arises of when the change in* x* occurs.

We will proceed to establish that the following sections on modeling addresses problems with temporality, effectively that time will always be an input variable.

### Conditionality

From above, removing the reference to humidity:

“What happens when it rains?”

The prompt provides that we will need to account for rain in the environment, there’s at least an E to define. We could model clouds and how much water is contained in the cloud. Another approach is rainfall is measured in depth, depth implies an area that the rain falls over, and time can indicate a fall rate.

Ultimately the usefulness of signals is dubious as we have no idea what to extract based on the prompt. Exit conditions inform the path to environment design. Tautologically, the more constrained a hypothesis can be formed around a hypothetical, the more successfully a simulation can be designed.

What this means is we cannot proceed without at least one condition to observe that is not the phenomenon itself. The Y in form A can not be X and the topic of C in form D can not be the only entity within E.

## Formalization

Up to this point, the variables used have been somewhat loosely defined (what is the environment? How can it be codified?). Before determining sufficiency, we’d best be served by formalizing their definitions.

### Environment (E)

Representation of the environment takes the form of a collection of *systems* which affect the *component* values of *entities* within the environment. An entity is something uniquely observable through its component values; anything observable is an entity. An instance of a component must be linked to only one entity. Entities have no behavior. Only systems *do *things in an environment.

Practically, component values are the signals to extract, they are what convey state, and their changing is the progression in the environment.

For example, time itself can be an entity, with a time counter component value tracking increments and a system can be responsible for incrementing the component value on every clock cycle. In a time bounded experiment, we would read the component value from the one entity with a time counter component, and check its value on every clock cycle.

### Time (T)

A discrete incrementation of time affects a resampling of states within the environment. The foundational variable, the one from which all changes cascades, is time.

"What happens to humidity as it rains?"

Form D hypotheticals does not explicitly rely on time, but serves as an indication that we’ve sufficiently captured a phenomenon. Emergent from this idea is there are other variables like time that serve as logical boundaries of observation.

### Condition (C)

That which can be evaluated through signals of the environment for a boolean state is a condition. They can be based on immediately available signals or rely on memory aggregate throughout the lifetime of the simulation.

# Simulations

In order to build a simulation from natural language prompts, we need to be confident form D both:

1. Sufficiently captures the intent of natural language hypotheses

2. Provides sufficient information to execute a simulation

Or, natural language hypotheticals shoul/d be compilable into form D, and a form D compilation needs to be compilable into a simulation as executable code.

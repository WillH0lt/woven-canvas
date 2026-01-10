ArrowsPlugin
* rather than filtersystems just import them individually
ArcArrow
* use a tuple of length 7 to define the arc: 3 points + thickness
* use field.enum for startArrowHead and endArrowHead
ArrowHandle
* use field.enum for kind
ElbowArrow
* use field.enum for startArrowHead and endArrowHead
helpers/ArcArrow
* I'd like to create Arc type in @infinitecanvas/math package which takes length 7 tuple. The logic of this file would be covered by methods on that type.
* Move these methods onto the ArcArrow Component. See packages\editor\src\components\Aabb.ts for an example.
calculateElbowArrowPath
* I'd also like to make Ray a type in @infinitecanvas/math package. So we can export some useful math functions to that package.
* instead of AabbRect let's use Aabb from @infinitecanvas/math package
closestPointToPoint
* use methods from math package
helpers/elbowArrow
* Move these methods onto the ElbowArrow Component. See packages\editor\src\components\Aabb.ts for an example.
* use math library where it's possible
ArrowDrawStateSingleton
* rename to ArrowDrawState 
* use a tuple type for pointingStartClientX and pointingStartWorldX
ArrowTransformStateSingleton
* rename to ArrowTransformState
systems/captureArrowTransformSystem.ts
* remove all the unneccessary checking for for "ctx" in event. The events should have ctx always I think. Remove the casting as Context too.
systems/updateArrowHitGeometrySystem.ts
* use math library where possible. If there's some useful methods missing, we can add them to the math package.
systems/updateArrowTransformSystem.ts
* use math library where possible. If there's some useful methods missing, we can add them to the math package.

other
* we need to implement arc arrow hit testing. Update HitGeometry component to have an arc tuple. then copy the math over from extension-arrows/core into the math package under Arc. 
* Update connector to use tuples. We can also use field.ref to reference connected entities.
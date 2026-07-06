# TODO

- Show results as % (we have counts, but not %). - ADDED TO BACKEND NEED TO ADD TO FRONT
- label for deck heading ADDED TO BACKEND NEED TO ADD TO FRONT
- On MCQ questions, we need to add an option to make the question focus on an image.  Like image mode vs text mode. In image mode the image takes center stage, text mode the image is secondary. Otherwise images could be too small for certain use cases
- vote for hte best answer doesn't make any sense for MCQ, it should only be for free form text or drawings..
- How do we know if a slide is actually scorable?
- We need to use more apply to all:

- Content image should be added directly in the slide.  On hover a box should appear that allows for an upload.. or on mobile a menu or placeholder.

- We have anonymize answers, allow anonynmous responses, and anonymous mode.  We need to make sense of it all.  

- SlideTyepGraphics.tsx right now all these graphic components have the same color and not really modifiable.  We need to be able to change the color easily, so fill and stroke as a prop?  Difficulty is some contain multiple colors.

- Fix modal, come up with consistent style for modals and variants.  sm md lg. Make responsive.

- Input components need to be more re-usable and better styles. For example they should have style defaults and variants but be able to be customized by ecah parent, especially layout.  Also need to allow space for info messages.

- We need to stop using the term player, instead we should use participant

BUGS
Allow multiple selection correct answers

 --- [ambi] [io-8080-exec-10] .m.m.a.ExceptionHandlerExceptionResolver : Resolved [org.springframework.http.converter.HttpMessageNotReadableException: JSON parse error: Cannot map `null` into type `boolean` (set `DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES` to 'false' to allow)]

FUTURE (NOT TO BE WORKED ON NOW):

- Response segmentation
- Response moderations
- Reactions (we already have emojies so how can we reconcile these).

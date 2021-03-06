module AsyncWrapper where

import React.Basic (JSX)
import React.Basic.DOM as DOM

type Props a =
  { wrapperState :: Progress a
  , readyView    :: JSX
  , editingView  :: a -> JSX
  , successView  :: JSX
  , errorView    :: String -> JSX
  }

data Progress a
  = Ready
  | Editing a
  | Loading a
  | Success
  | Error String

asyncWrapper :: forall a. Props a -> JSX
asyncWrapper props = case props.wrapperState of
  Ready     -> props.readyView
  Editing a -> props.editingView a
  Loading a -> loadingSpinner
  Success   -> props.successView
  Error msg -> props.errorView msg

loadingSpinner :: JSX
loadingSpinner = DOM.div { className: "tiny-spinner right" }

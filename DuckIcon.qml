import QtQuick
import QtQuick.Shapes
import qs.Commons

// The duck from OPNduck's startup splash screen (64x64 viewBox), drawn natively.
// The eye is a plain dot cut out of the body, so it is truly transparent.
Item {
  id: root
  property real iconSize: Style.font.icon
  property color color: Color.accent

  width: iconSize
  height: iconSize
  implicitWidth: iconSize
  implicitHeight: iconSize

  Shape {
    width: 64
    height: 64
    scale: root.iconSize / 64
    transformOrigin: Item.TopLeft
    preferredRendererType: Shape.CurveRenderer

    ShapePath {
      strokeColor: "transparent"
      fillColor: root.color
      fillRule: ShapePath.OddEvenFill
      // body + eye hole (even-odd: the inner circle is left unfilled)
      PathSvg { path: "M10 38c0-8 7-13 15-13h4c-2-9 3-17 12-17 8 0 13 6 13 13 0 0-1 0-2 0l7 3-7 3c-1 14-8 23-18 23H26C16 49 10 45 10 38z M45 14a3 3 0 1 1 0 6a3 3 0 1 1 0-6z" }
    }
    ShapePath {
      strokeColor: "transparent"
      fillColor: Qt.rgba(root.color.r, root.color.g, root.color.b, 0.55)
      PathSvg { path: "M24 38c0 5 5 8 11 8 7 0 12-3 13-8-5 2-10 2-14 1-4-1-7-3-10-1z" }
    }
  }
}

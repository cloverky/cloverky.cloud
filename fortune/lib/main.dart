import 'package:flutter/material.dart';

void main() {
  runApp(const FridgeAIApp());
}

// Light mode design tokens
const Color _bg = Color(0xFFFFFFFF);
const Color _topMint = Color(0xFFCFE9D8);
const Color _accent = Color(0xFF4DB87E);
const Color _brandText = Color(0xFF2E8B57);
const Color _fg = Color(0xFF171717);
const Color _mutedFg = Color(0xFF6B7280);
const Color _border = Color(0xFFE5E7EB);
const Color _buttonBg = Color(0xFF171717);

class FridgeAIApp extends StatelessWidget {
  const FridgeAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FridgeAI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: _bg,
        colorScheme: const ColorScheme.light(
          primary: _accent,
          secondary: _brandText,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
      ),
      home: const IntroScreen(),
    );
  }
}

class IntroScreen extends StatelessWidget {
  const IntroScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu, color: _fg),
          onPressed: () {},
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                color: _brandText,
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Icon(Icons.kitchen, size: 16, color: Colors.white),
            ),
            const SizedBox(width: 8),
            const Text(
              'FridgeAI',
              style: TextStyle(
                color: _fg,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _border, width: 1.5),
              ),
              child: const Icon(
                Icons.highlight_off_outlined,
                size: 20,
                color: _fg,
              ),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Top mint gradient
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: size.height * 0.42,
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [_topMint, _bg],
                ),
              ),
            ),
          ),

          // Chef hat watermark
          Positioned(
            top: size.height * 0.08,
            right: size.width * 0.02,
            child: const Opacity(
              opacity: 0.12,
              child: _ChefHatIcon(size: 130, color: _mutedFg),
            ),
          ),

          // Main content
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: size.height * 0.06),
                  const _BadgePill(),
                  const SizedBox(height: 22),
                  const _HeroTitle(),
                  const SizedBox(height: 24),
                  const _Description(),
                  const SizedBox(height: 36),
                  const _CtaRow(),
                  SizedBox(height: size.height * 0.20),
                  // faint watermark below CTA
                  const Align(
                    alignment: Alignment.centerRight,
                    child: Opacity(
                      opacity: 0.10,
                      child: Icon(
                        Icons.highlight_off_outlined,
                        size: 80,
                        color: _mutedFg,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Weather widget — bottom right
          Positioned(
            bottom: 36,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.wb_sunny_outlined, size: 16, color: _mutedFg),
                  SizedBox(width: 6),
                  Text(
                    '18°  맑음 · 서울',
                    style: TextStyle(
                      fontSize: 13,
                      color: _fg,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom drag handle
          Positioned(
            bottom: 14,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: _border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BadgePill extends StatelessWidget {
  const _BadgePill();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: _accent.withValues(alpha: 0.30)),
        color: _accent.withValues(alpha: 0.08),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.inventory_2_outlined, size: 14, color: _brandText),
          SizedBox(width: 7),
          Text(
            '당신만의 냉장고 도우미',
            style: TextStyle(
              fontSize: 13,
              color: _brandText,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroTitle extends StatelessWidget {
  const _HeroTitle();

  @override
  Widget build(BuildContext context) {
    return const Text.rich(
      TextSpan(
        style: TextStyle(
          fontSize: 44,
          height: 1.22,
          letterSpacing: -1.0,
          fontWeight: FontWeight.bold,
        ),
        children: [
          TextSpan(
            text: '똑똑한 ',
            style: TextStyle(color: Color(0xFF4A4A4A)),
          ),
          TextSpan(
            text: 'AI',
            style: TextStyle(color: _brandText),
          ),
          TextSpan(
            text: '로\n',
            style: TextStyle(color: Color(0xFF4A4A4A)),
          ),
          TextSpan(
            text: '냉장고를\n',
            style: TextStyle(color: _fg),
          ),
          TextSpan(
            text: '더 스마트하게.',
            style: TextStyle(color: _brandText),
          ),
        ],
      ),
    );
  }
}

class _Description extends StatelessWidget {
  const _Description();

  @override
  Widget build(BuildContext context) {
    return const Text(
      'FridgeAI는 여러 AI가 함께 도와\n'
      '냉장고 재고를 실시간으로 관리하고,\n'
      '개인의 취향과 보유 식재료에 맞는\n'
      '맞춤형 레시피를 추천합니다.',
      style: TextStyle(fontSize: 15, height: 1.9, color: Color(0xFF4A7A5A)),
    );
  }
}

class _CtaRow extends StatelessWidget {
  const _CtaRow();

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        ElevatedButton(
          onPressed: () {},
          style: ElevatedButton.styleFrom(
            backgroundColor: _buttonBg,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            elevation: 0,
          ),
          child: const Text(
            '시작하기',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
        ),
        OutlinedButton(
          onPressed: () {},
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: _border, width: 1.5),
            foregroundColor: _fg,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('문서 보기', style: TextStyle(fontSize: 16)),
              SizedBox(width: 8),
              Icon(Icons.arrow_forward, size: 16),
            ],
          ),
        ),
      ],
    );
  }
}

// Chef hat drawn with CustomPainter
class _ChefHatIcon extends StatelessWidget {
  final double size;
  final Color color;
  const _ChefHatIcon({required this.size, required this.color});

  @override
  Widget build(BuildContext context) =>
      CustomPaint(size: Size(size, size), painter: _ChefHatPainter(color));
}

class _ChefHatPainter extends CustomPainter {
  final Color color;
  const _ChefHatPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.045
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final w = size.width;
    final h = size.height;

    // Brim (flat rectangle at bottom)
    final brimLeft = w * 0.12;
    final brimRight = w * 0.88;
    final brimTop = h * 0.70;
    final brimBottom = h * 0.86;
    canvas.drawRRect(
      RRect.fromLTRBR(
        brimLeft,
        brimTop,
        brimRight,
        brimBottom,
        const Radius.circular(4),
      ),
      paint,
    );

    // Hat dome — large oval arc on top
    final hatPath = Path();
    hatPath.moveTo(brimLeft, brimTop);
    hatPath.cubicTo(
      brimLeft,
      h * 0.10,
      brimRight,
      h * 0.10,
      brimRight,
      brimTop,
    );
    canvas.drawPath(hatPath, paint);
  }

  @override
  bool shouldRepaint(covariant _ChefHatPainter old) => old.color != color;
}

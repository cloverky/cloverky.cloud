import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fortune/catalog/catalog_api.dart';
import 'package:fortune/catalog/catalog_screen.dart';

class FakeCatalogApi implements CatalogApi {
  FakeCatalogApi({this.fail = false});

  final bool fail;
  int? askedCategoryId;

  @override
  Future<List<Category>> categories() async {
    if (fail) throw Exception('boom');
    return const [Category(id: 1, name: '채소'), Category(id: 2, name: '과일')];
  }

  @override
  Future<List<Food>> foods({int? categoryId}) async {
    if (fail) throw Exception('boom');
    askedCategoryId = categoryId;
    return categoryId == 2
        ? const [Food(id: 9, name: '사과', unit: '개')]
        : const [Food(id: 1, name: '양파', unit: '개')];
  }
}

Future<void> _pump(WidgetTester tester, CatalogApi api) async {
  await tester.pumpWidget(MaterialApp(home: CatalogScreen(api: api)));
}

void main() {
  testWidgets('불러오면 식재료를 보여준다', (tester) async {
    await _pump(tester, FakeCatalogApi());
    await tester.pumpAndSettle();

    expect(find.textContaining('양파'), findsOneWidget);
  });

  testWidgets('카테고리를 고르면 그 카테고리만 조회한다', (tester) async {
    final api = FakeCatalogApi();
    await _pump(tester, api);
    await tester.pumpAndSettle();

    await tester.tap(find.text('과일'));
    await tester.pumpAndSettle();

    expect(api.askedCategoryId, 2);
    expect(find.textContaining('사과'), findsOneWidget);
  });

  testWidgets('실패하면 안내를 보여주고 화면이 죽지 않는다', (tester) async {
    await _pump(tester, FakeCatalogApi(fail: true));
    await tester.pumpAndSettle();

    expect(find.textContaining('불러오지 못했'), findsOneWidget);
  });
}
